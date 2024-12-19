"use client"

import queryString from 'query-string';
export const clientId = '67b5ea699c8d42daa3602d679bc51317';
export const clientSecret = '05d5bc0d7d824e279b1631e1f34307e0';
export const redirectUri = "http://localhost:3000/callback";
export const scopes = "user-read-recently-played";

const Login = () => {
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
    <div>
      <button onClick={handleLogin}>Login with Spotify</button>
    </div>
  );
};

export default Login;