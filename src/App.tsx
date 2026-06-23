import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, ZoomIn, ZoomOut, Image as ImageIcon } from 'lucide-react';

export default function App() {
  const CANVAS_SIZE = 300;
  const OUTPUT_SIZE = 400;

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.1);
  const [maxScale, setMaxScale] = useState(5);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateScaleAndPosition = (newScale: number) => {
    newScale = Math.max(minScale, Math.min(maxScale, newScale));
    if (newScale === scale) return;

    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const dx = position.x - cx;
    const dy = position.y - cy;
    const ratio = newScale / scale;

    setPosition({ x: cx + dx * ratio, y: cy + dy * ratio });
    setScale(newScale);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const patternSize = 10;
    for (let i = 0; i < CANVAS_SIZE / patternSize; i++) {
      for (let j = 0; j < CANVAS_SIZE / patternSize; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#f3f4f6';
        ctx.fillRect(i * patternSize, j * patternSize, patternSize, patternSize);
      }
    }

    if (image) {
      ctx.drawImage(image, position.x, position.y, image.width * scale, image.height * scale);
    } else {
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('画像が選択されていません', CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    }

    if (image) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2, true);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 0.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 1.5, 0, Math.PI * 2);
      ctx.stroke();

      const centerX = CANVAS_SIZE / 2;
      const centerY = CANVAS_SIZE / 2;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(CANVAS_SIZE, centerY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, CANVAS_SIZE);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [image, scale, position]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      if (!image) return;
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
      updateScaleAndPosition(scale * zoomFactor);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [image, scale, position, minScale, maxScale]);

  const processFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;
      const img = new Image();
      img.onload = () => {
        const initScale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
        setMinScale(initScale * 0.2);
        setMaxScale(initScale * 5);
        setScale(initScale);
        setPosition({
          x: (CANVAS_SIZE - img.width * initScale) / 2,
          y: (CANVAS_SIZE - img.height * initScale) / 2,
        });
        setImage(img);
      };
      img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const getClientCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    const me = e as React.MouseEvent;
    return { x: me.clientX, y: me.clientY };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!image) return;
    setIsDragging(true);
    const coords = getClientCoords(e);
    setDragStart({ x: coords.x - position.x, y: coords.y - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !image) return;
    const coords = getClientCoords(e);
    setPosition({ x: coords.x - dragStart.x, y: coords.y - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    updateScaleAndPosition(parseFloat(e.target.value));
  const zoomIn = () => updateScaleAndPosition(scale * 1.01);
  const zoomOut = () => updateScaleAndPosition(scale * 0.99);

  const downloadImage = (isTransparent: boolean) => {
    if (!image) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = OUTPUT_SIZE;
    exportCanvas.height = OUTPUT_SIZE;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    const exportRatio = OUTPUT_SIZE / CANVAS_SIZE;

    if (!isTransparent) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    }

    if (isTransparent) {
      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    ctx.drawImage(
      image,
      position.x * exportRatio,
      position.y * exportRatio,
      image.width * scale * exportRatio,
      image.height * scale * exportRatio
    );

    const dataUrl = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = isTransparent ? 'profile_icon_round.png' : 'profile_icon_square.png';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600">
            <ImageIcon size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">SNSアイコンメーカー</h1>
        </div>

        {/* ファイル選択・ドラッグ＆ドロップエリア */}
        <div className="mb-6">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl py-8 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-50
              ${isDragOver
                ? 'bg-blue-100 border-blue-400 text-blue-700 scale-[1.02]'
                : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300'}`}
          >
            <Upload size={28} className={`transition-transform duration-300 ${isDragOver ? '-translate-y-1' : ''}`} />
            <div className="text-center">
              <span className="font-medium block text-base">画像を選択するか、ここにドロップ</span>
            </div>
          </div>
        </div>

        {/* プレビューキャンバス */}
        <div className="flex justify-center mb-6">
          <div className="shadow-sm border border-gray-300 bg-white">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className={`touch-none ${image ? 'cursor-move' : 'cursor-default'}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            />
          </div>
        </div>

        {/* スライダー */}
        {image && (
          <div className="mb-8 px-2 animate-fade-in">
            <div className="flex items-center gap-4 text-gray-400 mb-2">
              <button
                onClick={zoomOut}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                title="縮小 (微調整)"
              >
                <ZoomOut size={20} />
              </button>
              <input
                type="range"
                min={minScale}
                max={maxScale}
                step={0.001}
                value={scale}
                onChange={handleZoomChange}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <button
                onClick={zoomIn}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                title="拡大 (微調整)"
              >
                <ZoomIn size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-400 text-center mt-3">
              画像をドラッグで移動、ホイールやスライダーで拡縮できます
            </p>
          </div>
        )}

        {/* ダウンロードボタン群 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => downloadImage(true)}
            disabled={!image}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold transition-all duration-200
              ${image
                ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            <Download size={20} />
            <span>透明背景で丸く保存 (PNG)</span>
          </button>

          <button
            onClick={() => downloadImage(false)}
            disabled={!image}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold transition-all duration-200
              ${image
                ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            <Download size={20} />
            <span>四角く切り抜いて保存 (PNG)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
