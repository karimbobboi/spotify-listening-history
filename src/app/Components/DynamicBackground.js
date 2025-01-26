import React, { useEffect, useRef } from "react";

const DynamicBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let gradientOffsetWidth = 0;
    let gradientOffsetHeight = 0;
    let direction = true;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const drawGradient = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Create a gradient
      const gradient = ctx.createLinearGradient(
        -width / 2 + gradientOffsetWidth,
        -height / 2 + gradientOffsetHeight,
        width / 2 + gradientOffsetWidth,
        height + gradientOffsetHeight
      );
      gradient.addColorStop(0, "#64024c"); // Color 1
      gradient.addColorStop(1, "#001d3d"); // Color 2

      // Fill the canvas with the gradient
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Update gradient offset for animation
      gradientOffsetWidth += direction ? 1 : -1;
      gradientOffsetHeight += direction ? 1 : -1;

      if (gradientOffsetWidth > width || gradientOffsetWidth < 0)
        direction = !direction;
    };

    const animate = () => {
      drawGradient();
      requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
      }}
    />
  );
};

export default DynamicBackground;