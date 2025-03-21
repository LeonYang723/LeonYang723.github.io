<script>
const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const connectBtn = document.getElementById('connectBtn');
const detectBtn = document.getElementById('detectBtn');

let BLEDevice, UARTService;

const UART_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

// ========= 藍牙連接 =========
async function connectBLE() {
  try {
    console.log("🔵 開始藍牙配對...");
    BLEDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [UART_SERVICE],
    });
    const server = await BLEDevice.gatt.connect();
    UARTService = await server.getPrimaryService(UART_SERVICE);
    console.log("✅ BLE 已連線");

    detectBtn.disabled = false;
    startVideo();
  } catch (e) {
    console.error("❌ BLE 連接錯誤:", e);
  }
}

// ========= 啟動鏡頭 =========
async function startVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };
    console.log("📷 攝影機啟動成功");
  } catch (err) {
    console.error("❌ 無法啟動攝影機:", err);
  }
}

// ========= 載入模型 =========
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
  console.log("✅ 模型載入完成");
}

// ========= 偵測人臉 + 傳送 =========
async function detectLandmarks() {
  console.log("🔍 開始偵測");
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks();

  if (!result) {
    console.log("😕 未偵測到人臉");
    return;
  }

  const resized = faceapi.resizeResults(result, displaySize);
  const landmarks = resized.landmarks.positions;

  drawLandmarks(landmarks);
  sendToESP32(landmarks);
}

// ========= 繪製點 =========
function drawLandmarks(landmarks) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "red";
  landmarks.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
    ctx.fill();
  });
}

// ========= 傳送藍牙數據 =========
async function sendToESP32(landmarks) {
  if (!UARTService) return;
  const txChar = await UARTService.getCharacteristic(RX_UUID);
  const data = landmarks.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('|');
  await txChar.writeValue(new TextEncoder().encode(data));
  console.log("📡 已傳送特徵點資料到 ESP32");
}

// ========= 事件綁定 =========
connectBtn.addEventListener('click', connectBLE);
detectBtn.addEventListener('click', detectLandmarks);

// 初始模型載入
loadModels();
</script>
