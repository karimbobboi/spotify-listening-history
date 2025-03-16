import React, { useEffect, useRef } from "react";
import './DynamicBackground.css';


const DynamicCircles = () => {
  const canvasRef = useRef(null);
  const maxRadius = window.innerWidth / 4;

  const Color = {
    vector: [
      "#00B4D8", "#0096C7", "#48CAE4", "#90E0EF", "#023E8A",  // Teal/Blue spectrum
      "#FF4D6D", "#FF7F50", "#FF8C64", "#FF9B7D", "#E85D04",  // Orange/Coral spectrum
      "#03045E", "#0077B6", "#CAF0F8", "#FB8500", "#FFB703"   // Additional gradient colors
    ],
    getRandom: () => {
      return Color.vector[Math.floor(Math.random() * Color.vector.length)];
    }
  };

  class Circle {
    constructor(
      r_min = randomNumber(maxRadius * 0.9, 200),
      x = randomNumber(window.innerWidth, r_min),
      y = randomNumber(window.innerHeight, r_min),
      dx = randomNumber(10, -10, [0]) / 15,
      dy = randomNumber(10, -10, [0]) / 15,
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

  class NoiseParticle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * window.innerWidth;
      this.y = Math.random() * window.innerHeight;
      this.alpha = Math.random() * 0.2; // Opacity between 0 and 0.2
      this.radius = Math.random() * 1.5; // Size between 0 and 1.5 pixels
    }

    draw(c) {
      c.beginPath();
      c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      c.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
      c.fill();
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
    const noiseParticles = [];
    const circleCount = 60;
    const noiseCount = 300; // Number of noise particles

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    for (let i = 0; i < circleCount; i++) {
      circles.push(new Circle());
    }

    for (let i = 0; i < noiseCount; i++) {
      noiseParticles.push(new NoiseParticle());
    }

    const animation = () => {
      c.clearRect(0, 0, canvas.width, canvas.height);

      // Draw circles
      circles.forEach((circle) => circle.run(c));

      // Draw noise particles
      noiseParticles.forEach(particle => {
        particle.draw(c);
        // Randomly reset some particles for dynamic effect
        if (Math.random() < 0.01) particle.reset();
      });

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