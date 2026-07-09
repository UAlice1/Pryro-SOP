import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAISettings } from "@/lib/ai";

export const maxDuration = 60; // audio processing can take time

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["audio/mp3", "audio/wav", "audio/m4a", "audio/mpeg", "audio/webm", "audio/ogg"];
    if (!validTypes.includes(audioFile.type) && !audioFile.name.match(/\.(mp3|wav|m4a|webm|ogg)$/i)) {
      return NextResponse.json({ error: "Unsupported audio format" }, { status: 400 });
    }

    // Max 25MB (OpenAI Whisper limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 25MB." }, { status: 400 });
    }

    const settings = await getAISettings(session.user.id);

    if (!settings.apiKey) {
      return NextResponse.json(
        { error: "No API key configured. Go to Settings → AI Provider." },
        { status: 400 },
      );
    }

    // Use OpenAI Whisper via the audio transcriptions endpoint
    // (works for OpenAI, OpenRouter, and compatible endpoints)
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile, audioFile.name || "recording.webm");
    whisperFormData.append("model", "whisper-1");
    whisperFormData.append("language", "en");
    whisperFormData.append(
      "prompt",
      "This is a business process description for a Standard Operating Procedure. " +
      "Transcribe accurately including all technical terms, role names, and process steps.",
    );

    const baseURL = settings.baseUrl ?? "https://api.openai.com/v1";
    const transcribeURL = `${baseURL}/audio/transcriptions`;

    const response = await fetch(transcribeURL, {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.apiKey}` },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[transcribe] Whisper API error:", errorText);
      return NextResponse.json(
        { error: "Transcription failed. Please check your API key and try again." },
        { status: 500 },
      );
    }

    const data = await response.json() as { text: string };
    const transcript = data.text?.trim();

    if (!transcript) {
      return NextResponse.json({ error: "No speech detected in the audio." }, { status: 422 });
    }

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("[transcribe] Error:", err);
    return NextResponse.json({ error: "Transcription service error" }, { status: 500 });
  }
}
