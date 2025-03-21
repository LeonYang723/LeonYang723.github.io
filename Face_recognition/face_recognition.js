async function detectLandmarks() {
  if (!video.srcObject) {
    console.warn("⚠️ 攝影機尚未啟動！");
    return;
  }

  // 1. 對齊尺寸
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  // 2. 偵測人臉
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks();

  if (!detection) {
    console.log("😕 沒有偵測到人臉");
    return;
  }

  // 3. 顯示特徵點
  const resized = faceapi.resizeResults(detection, displaySize);
  const landmarks = resized.landmarks.positions;
  console.log("✅ 偵測到人臉，共有點數：", landmarks.length);
  drawLandmarks(landmarks);
  sendToESP32(landmarks);
}
