import React, { useEffect, useRef } from "react";
import './DynamicBackground.css';


const DynamicCircles = () => {
  const canvasRef = useRef(null);
  const maxRadius = window.innerWidth / 6;

  const Color = {
    vector: [
      "#000a14", "#001d3d", "#001d3d", "#000a14", "#001d3d", "#001d3d", 
      "#64024c", "#000a14", "#64024c", "#64024c", "#000a14", "#000a14", 
      "#000a14", "#000a14", "#001d3d"
    ],
    getRandom: () => {
      return Color.vector[Math.floor(Math.random() * Color.vector.length)];
    }
  };

  class Circle {
    constructor(
      r_min = randomNumber(maxRadius * 0.9, 120),
      x = randomNumber(window.innerWidth, r_min),
      y = randomNumber(window.innerHeight, r_min),
      dx = randomNumber(10, -20, [0]) / 30,
      dy = randomNumber(10, -10, [0]) / 10,
      color = Color.getRandom()
    ) {
      this.r_min = r_min;
      this.x = x;
      this.y = y;
      this.dx = dx;
      this.dy = dy;
      this.color = color;
      this.r = r_min;
    }

    side() {
      return {
        right: this.x + this.r,
        left: this.x - this.r,
        bottom: this.y + this.r,
        top: this.y - this.r
      };
    }

    draw(c) {
      c.beginPath();
      c.arc(this.x, this.y, this.r, 0, Math.PI * 2, false);
      c.fillStyle = this.color;
      c.fill();
    }

    run(c) {
      // Detect collision with canvas edges
      if (this.side().right > window.innerWidth || this.side().left < 0) this.dx *= -1;
      if (this.side().bottom > window.innerHeight || this.side().top < 0) this.dy *= -1;

      // Shrink the circle
      if (this.r > this.r_min) this.r -= 1;

      this.x += this.dx;
      this.y += this.dy;

      this.draw(c);
    }
  }

  const randomNumber = (max = 1, min = 0, forbidden = []) => {
    let res;
    do {
      res = Math.floor(min + Math.random() * (max - min));
    } while (forbidden.includes(res));
    return res;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;

    const circles = [];
    const circleCount = 60;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    for (let i = 0; i < circleCount; i++) {
      circles.push(new Circle());
    }

    const animation = () => {
      c.clearRect(0, 0, canvas.width, canvas.height);

      // Update circle positions
      circles.forEach((circle) => circle.run(c));

      // Request next frame
      requestAnimationFrame(animation);
    };

    resizeCanvas();
    animation();

    // Handle resize event
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef}
  style={{
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: -1,
  }}/>;
};

export default DynamicCircles;