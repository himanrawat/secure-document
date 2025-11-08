import type { ObjectDetection, DetectedObject } from "@tensorflow-models/coco-ssd";
import { CameraInsight } from "@/lib/types/security";

type TfModule = typeof import("@tensorflow/tfjs");

let cocoModelPromise: Promise<ObjectDetection> | null = null;
let backendReadyPromise: Promise<void> | null = null;
let tfModule: TfModule | null = null;

async function ensureTfBackend() {
  if (backendReadyPromise) {
    return backendReadyPromise;
  }
  backendReadyPromise = (async () => {
    if (!tfModule) {
      tfModule = await import("@tensorflow/tfjs");
      await import("@tensorflow/tfjs-backend-webgl");
      await import("@tensorflow/tfjs-backend-cpu");
    }
    try {
      await tfModule.setBackend("webgl");
    } catch {
      await tfModule.setBackend("cpu");
    }
    await tfModule.ready();
  })();

  return backendReadyPromise;
}

async function getModel() {
  if (!cocoModelPromise) {
    await ensureTfBackend();
    const cocoSsd = await import("@tensorflow-models/coco-ssd");
    cocoModelPromise = cocoSsd.load();
  }
  return cocoModelPromise;
}

function parsePredictions(predictions: DetectedObject[]) {
  const persons = predictions.filter(
    (prediction) => prediction.class === "person" && prediction.score >= 0.45,
  );
  const devices = predictions.filter(
    (prediction) =>
      (prediction.class === "cell phone" ||
        prediction.class === "remote" ||
        prediction.class === "camera") &&
      prediction.score >= 0.4,
  );

  return {
    personsDetected: persons.length,
    externalDeviceDetected: devices.length > 0,
  };
}

function computeObstructionScore(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return 0;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let blackPixels = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] < 10 && pixels[i + 1] < 10 && pixels[i + 2] < 10) {
      blackPixels++;
    }
  }
  const coverage = blackPixels / (pixels.length / 4);
  return Number(coverage.toFixed(2));
}

function computeBrightnessDelta(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return 0;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let luminance = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    luminance += 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
  }
  return Number((luminance / (pixels.length / 4)).toFixed(2));
}

export async function evaluateCameraFrame(video: HTMLVideoElement): Promise<CameraInsight> {
  const model = await getModel();
  const predictions = await model.detect(video);
  const { personsDetected, externalDeviceDetected } = parsePredictions(predictions);

  const obstructionScore = computeObstructionScore(video);
  const brightnessDelta = computeBrightnessDelta(video);

  const frameHash = crypto.randomUUID();
  const livenessScore = personsDetected > 0 ? 0.9 : 0;

  return {
    frameHash,
    obstructionScore,
    personsDetected,
    externalDeviceDetected,
    livenessScore,
    brightnessDelta,
    updatedAt: Date.now(),
  };
}
