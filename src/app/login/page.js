"use client"
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import queryString from 'query-string';
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

  useEffect(() => {
    handleLogin();
  }, [])

  return (
    <div>
      {/* <button onClick={handleLogin}>Login with Spotify</button> */}
    </div>
  );
};

export default Login;