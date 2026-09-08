"use client";

import { useRef, useState, useCallback } from "react";

type Props = {
  plan: any;
  onActions: (actions: any[]) => void;
  onMessage: (m: string) => void;
};

/**
 * OpenAI Realtime WebRTC client:
 * 1) POST /api/voice/realtime → ephemeral session / client_secret
 * 2) RTCPeerConnection + data channel for events
 * 3) function_call → POST /api/voice/tool → function_call_output
 */
export default function RealtimeVoice({ plan, onActions, onMessage }: Props) {
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState("OpenAI Realtime idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    setLive(false);
    setStatus("Stopped");
  }, []);

  const start = useCallback(async () => {
    setStatus("Fetching Realtime session…");
    const sess = await fetch("/api/voice/realtime", { method: "POST" }).then((r) => r.json());
    if (!sess.ok && sess.mode === "local") {
      onMessage(sess.message || "OpenAI not configured");
      setStatus("No OPENAI_API_KEY");
      return;
    }

    const EPHEMERAL =
      sess.client_secret?.client_secret?.value ||
      sess.client_secret?.value ||
      sess.client_secret?.client_secret ||
      null;

    if (!EPHEMERAL && sess.mode !== "openai_realtime") {
      onMessage(
        `Realtime session mode=${sess.mode}. ${sess.api_error || sess.error || "Set OPENAI_API_KEY for live audio."}`
      );
      setStatus(sess.mode);
      // Still store session for debugging
      (window as any).__s2cRealtime = sess;
      return;
    }

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    // Remote audio
    const audio = new Audio();
    audio.autoplay = true;
    audioRef.current = audio;
    pc.ontrack = (e) => {
      audio.srcObject = e.streams[0];
    };

    // Mic
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    ms.getTracks().forEach((t) => pc.addTrack(t, ms));

    const dc = pc.createDataChannel("oai-events");
    dcRef.current = dc;
    dc.onopen = () => {
      setStatus("Data channel open — speak");
      // session.update with tools if needed
      if (sess.session) {
        dc.send(JSON.stringify({ type: "session.update", session: sess.session }));
      }
    };
    dc.onmessage = async (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "response.function_call_arguments.done" || msg.type === "response.output_item.done") {
          const name = msg.name || msg.item?.name;
          const callId = msg.call_id || msg.item?.call_id;
          const argsRaw = msg.arguments || msg.item?.arguments || "{}";
          if (name && callId) {
            setStatus(`Tool: ${name}`);
            const res = await fetch("/api/voice/tool", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, arguments: argsRaw, plan }),
            }).then((r) => r.json());
            onMessage(res.message);
            if (res.client_actions?.length) onActions(res.client_actions);
            dc.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: callId,
                  output: JSON.stringify({ ok: res.ok, message: res.message }),
                },
              })
            );
            dc.send(JSON.stringify({ type: "response.create" }));
          }
        }
        if (msg.type === "response.audio_transcript.done") {
          onMessage(`AI: ${msg.transcript}`);
        }
        if (msg.type === "error") {
          setStatus(msg.error?.message || "Realtime error");
        }
      } catch {
        /* ignore */
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = sess.session?.model || "gpt-4o-realtime-preview";
    const sdpRes = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL}`,
        "Content-Type": "application/sdp",
        "OpenAI-Beta": "realtime=v1",
      },
    });
    if (!sdpRes.ok) {
      const t = await sdpRes.text();
      setStatus(`SDP failed: ${t.slice(0, 120)}`);
      onMessage("Realtime WebRTC SDP exchange failed — check API key / model access.");
      stop();
      return;
    }
    const answer = await sdpRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answer });
    setLive(true);
    setStatus("Listening…");
  }, [onActions, onMessage, plan, stop]);

  return (
    <button
      className="btn"
      style={{ background: live ? "#dc2626" : "#7c3aed" }}
      onClick={() => (live ? stop() : start())}
      title={status}
    >
      {live ? "Stop Realtime" : "OpenAI Realtime"}
    </button>
  );
}
