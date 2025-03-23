"use client"

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useRouter, useSearchParams } from 'next/navigation';
import queryString from 'query-string';
import DynamicBackground from "/src/app/components/DynamicBackground.js";
import Container from "react-bootstrap/Container";

export const clientId = process.env.NEXT_PUBLIC_clientId;
export const clientSecret = process.env.NEXT_PUBLIC_clientSecret;
export const redirectUri = "http://localhost:3000/callback";
export const scopes = "user-read-recently-played";

const Login = () => {
  const searchParams = useSearchParams();
  const target_page = searchParams.get('page') ?? '';
  // const redirectUri = `http://localhost:3000/callback?page=${encodeURIComponent(target_page)}`;

  const handleLogin = () => {
    const authUrl =
      'https://accounts.spotify.com/authorize?' +
      queryString.stringify({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: scopes
      });
    window.location.href = authUrl;
  };

  return (
    <main style={{ position: "relative", zIndex: 1, height: "100vh" }}>
      <DynamicBackground />
      <div className="d-flex justify-content-center align-items-center" 
        style={{ 
          height: "100vh",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div className="text-center p-5 rounded-4 border border-dark"
          style={{ 
            backgroundColor: "rgba(0,0,0,0.6)",
            maxWidth: "400px",
            height: "40vh"
          }}
        >
          <h2 className="text-light mb-4">Track Your Listening History</h2>
          <p className="text-light opacity-75 mb-4">
            Connect your Spotify account to view detailed statistics about your listening habits.
          </p>
          <button 
            className="btn btn-lg w-100" 
            onClick={handleLogin}
            style={{
              backgroundColor: "#1ed760",
              color: "#000",
              fontWeight: "600",
              padding: "0.8rem",
              fontSize: "1.1rem",
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#1fdf64"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#1ed760"}
          >
            <i className="bi bi-spotify me-2"></i>
            Connect with Spotify
          </button>
        </div>
      </div>
    </main>
  );
};

export default Login;