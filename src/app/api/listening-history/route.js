import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import { NextResponse } from "next/server";

const filePath = path.join(process.cwd(), "src/app/listening_history.csv");
const todays_date_iso = () => {
  const currentDate = new Date();
  return currentDate.toISOString();
};

const extract_artists = (artists_array) => {
  return artists_array.map((artist) => artist.name).join("|");
};

const add_new_entry = (item) => {
  const date_time = item.played_at;
  const song = item.track.name;
  const artist = extract_artists(item.track.artists);
  const album = item.track.album.name;
  const link = item.track.external_urls.spotify;
  const date_added = todays_date_iso();
  const entry = `\r\n"${date_time}","${song}","${artist}","${album}","${link}","${date_added}"`;
  return entry;
};

const add_to_history = (items) => {
  let lastPlayedAt = null;

  if (fs.existsSync(filePath)) {
    const existingData = fs.readFileSync(filePath, 'utf8');
    const lines = existingData.trim().split('\n');
    if (lines.length > 1) {
      const lastRow = lines[lines.length - 1];
      lastPlayedAt = lastRow.split(',')[0].replace(/"/g, '').trim(); // extract last played_at
    }
  }

  let temp = '';
  for (const element of items) {
    if (element.played_at <= lastPlayedAt) {
      continue;
    }
    temp += add_new_entry(element);
  }

  if(temp){
    fs.appendFileSync(filePath, temp, 'utf8');
    console.log('new entries added to history');
  } else {
    console.log('no new entries added');
  }
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ message: "Invalid data" }, { status: 400 });
    }

    const tracks = items.sort((a, b) => a.played_at.localeCompare(b.played_at));
    add_to_history(tracks);

    const updatedResults = [];
    const stream = fs.createReadStream(filePath).pipe(csvParser());

    await new Promise((resolve, reject) => {
      stream.on("data", (data) => updatedResults.push(data));
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    return NextResponse.json(updatedResults, { status: 200 });
  } catch (error) {
    console.error("Error updating CSV:", error);
    return NextResponse.json({ status: 500 });
  }
}