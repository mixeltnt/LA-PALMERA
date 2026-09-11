import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Escanear Código de Barras",
}) {
  const [errorMsg, setErrorMsg] = useState("");
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef(null);
  const scannerContainerId = "palmera-camera-scanner-view";

  const playBeep = () => {
    try {
      if ("vibrate" in navigator) {
        navigator.vibrate(100);
      }
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Ignorar si el audio está bloqueado por permisos
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setErrorMsg("");

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!mounted) return;
        if (devices && devices.length) {
          setCameras(devices);
          // Preferir cámara trasera ('back' o 'environment')
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("trasera") ||
              d.label.toLowerCase().includes("rear") ||
              d.label.toLowerCase().includes("environment")
          );
          const camId = backCam ? backCam.id : devices[devices.length - 1].id;
          setSelectedCameraId(camId);
          startScanning(camId);
        } else {
          setErrorMsg("No se encontraron cámaras disponibles.");
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Error al obtener cámaras:", err);
        setErrorMsg("Permiso de cámara denegado o no disponible en este dispositivo.");
      });

    return () => {
      mounted = false;
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async (cameraId) => {
    try {
      if (html5QrCodeRef.current && isScanning) {
        await html5QrCodeRef.current.stop();
      }

      const qrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = qrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.333,
      };

      await qrCode.start(
        cameraId,
        config,
        (decodedText) => {
          playBeep();
          stopScanning();
          onScan(decodedText);
          onClose();
        },
        () => {
          // Errores menores de cuadro por cuadro ignorados
        }
      );

      setIsScanning(true);
      setErrorMsg("");
    } catch (err) {
      console.error("Error iniciando escáner:", err);
      setErrorMsg("No se pudo iniciar la cámara. Verifica los permisos.");
    }
  };

  const stopScanning = async () => {
    try {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
      setIsScanning(false);
    } catch (err) {
      console.error("Error deteniendo escáner:", err);
    }
  };

  const handleCameraChange = (e) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startScanning(newId);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{
        backgroundColor: "rgba(0,0,0,0.85)",
        zIndex: 1060,
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-dark text-white">
          <div className="modal-header border-0 bg-dark py-3 px-3 d-flex justify-content-between align-items-center">
            <h5 className="modal-title fs-6 fw-bold text-white d-flex align-items-center gap-2 m-0">
              <i className="bi bi-camera-fill text-success"></i>
              {title}
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Cerrar"
              onClick={() => {
                stopScanning();
                onClose();
              }}
            ></button>
          </div>

          <div className="modal-body p-2 p-sm-3 text-center position-relative">
            {errorMsg && (
              <div className="alert alert-danger py-2 small mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {errorMsg}
              </div>
            )}

            {cameras.length > 1 && (
              <div className="mb-2 text-start">
                <label className="form-label text-muted small mb-1">Seleccionar Cámara:</label>
                <select
                  className="form-select form-select-sm bg-secondary text-white border-0"
                  value={selectedCameraId}
                  onChange={handleCameraChange}
                >
                  {cameras.map((cam, idx) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Cámara ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div
              id={scannerContainerId}
              className="rounded-3 overflow-hidden shadow-inner mx-auto border border-secondary"
              style={{
                width: "100%",
                maxWidth: "360px",
                minHeight: "260px",
                backgroundColor: "#000",
              }}
            ></div>

            <p className="text-white-50 small mt-2 mb-0">
              <i className="bi bi-upc-scan me-1 text-success"></i>
              Apunta la cámara al código de barras (EAN-13, Code 128, QR)
            </p>
          </div>

          <div className="modal-footer border-0 bg-dark py-2 px-3 justify-content-center">
            <button
              type="button"
              className="btn btn-outline-light btn-sm px-4 rounded-pill"
              onClick={() => {
                stopScanning();
                onClose();
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
