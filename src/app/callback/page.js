"use client"

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import axios from 'axios';

export const clientId = '67b5ea699c8d42daa3602d679bc51317';
export const clientSecret = '05d5bc0d7d824e279b1631e1f34307e0';
export const redirectUri = "http://localhost:3000/callback";
export const scopes = "user-read-recently-played";

export default function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code' || null);

  useEffect(() => {
    const fetchAccessToken = async () => {
      if (!code) return;

      try {
        const response = await axios.post(
          'https://accounts.spotify.com/api/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
        
        const { access_token } = response.data;
        if (access_token) {
          localStorage.setItem("spotify_access_token", access_token);
          router.push("/");
        }
      } catch (error) {
        console.error('Error exchanging code for token:', error);
      }
    };

    fetchAccessToken();
  }, [router.query, router]);

  return (
    <div>
      <h1>Processing...</h1>
    </div>
  );
}