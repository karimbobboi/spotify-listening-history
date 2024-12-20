"use client"

import queryString from 'query-string';
export const clientId = process.env.NEXT_PUBLIC_clientId;
export const clientSecret = process.env.NEXT_PUBLIC_clientSecret;
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