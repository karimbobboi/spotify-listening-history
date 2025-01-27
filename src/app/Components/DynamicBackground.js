import React, { useEffect, useRef } from "react";

const DynamicBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let gradientOffsetWidth = 0;
    let gradientOffsetHeight = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    let velocityX = 3; // Horizontal velocity
    let velocityY = 3; // Vertical velocity

    const drawGradient = () => {
      const width = canvas.width;
      const height = canvas.height;

      const gradient = ctx.createLinearGradient(
        -width / 2 + gradientOffsetWidth,
        -height / 2 + gradientOffsetHeight,
        width / 2 + gradientOffsetWidth,
        height + gradientOffsetHeight
      );
      gradient.addColorStop(0, "#000a14");
      gradient.addColorStop(0.5, "#001d3d"); 
      gradient.addColorStop(1, "#64024c"); 

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      gradientOffsetWidth += velocityX;
      gradientOffsetHeight += velocityY;

      // Randomly adjust velocity direction and magnitude
      if (Math.random() < 0.01) velocityX = (Math.random() - 0.5) * 3; 
      if (Math.random() < 0.01) velocityY = (Math.random() - 0.5) * 3; 

      // Keep gradient offsets within bounds
      if (gradientOffsetWidth > width || gradientOffsetWidth < -width) velocityX *= -3;
      if (gradientOffsetHeight > height || gradientOffsetHeight < -height) velocityY *= -3;
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