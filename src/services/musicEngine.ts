import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

let aiInstance: GoogleGenerativeAI | null = null;

function getAI(): GoogleGenerativeAI {
  if (!aiInstance) {
    const apiKey =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
      (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) ||
      (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
      "";

    if (!apiKey) {
      console.error("CRITICAL: Gemini API Key not found. Please set VITE_GEMINI_API_KEY in Vercel.");
    } else {
      console.log("Gemini AI instance initialized successfully (Key length: " + apiKey.length + ")");
    }

    aiInstance = new GoogleGenerativeAI(apiKey);
  }
  return aiInstance;
}

export interface MusicMetadata {
  titulo: string;
  artista: string;
  capa_url: string;
  cor_dominante: string;
  lyrics: { time: number; text: string }[];
}

export function getLocalFallbackCover(query: string): string {
  const fallbacks = [
    '/assets/covers/fallback_1.svg',
    '/assets/covers/fallback_2.svg',
    '/assets/covers/fallback_3.svg',
    '/assets/covers/fallback_4.svg'
  ];
  // Simple hash for consistent selection per query
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = ((hash << 5) - hash) + query.charCodeAt(i);
    hash |= 0;
  }
  return fallbacks[Math.abs(hash) % fallbacks.length];
}

export async function fetchMusicMetadata(query: string): Promise<MusicMetadata | null> {
  try {
    console.log("Fetching metadata for query:", query);
    const genAI = getAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            musica: {
              type: SchemaType.OBJECT,
              properties: {
                titulo: { type: SchemaType.STRING },
                artista: { type: SchemaType.STRING },
                capa_url: { type: SchemaType.STRING },
                cores: {
                  type: SchemaType.OBJECT,
                  properties: {
                    principal: { type: SchemaType.STRING }
                  },
                  required: ["principal"]
                },
                letras: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      tempo: { type: SchemaType.NUMBER },
                      texto: { type: SchemaType.STRING }
                    },
                    required: ["tempo", "texto"]
                  }
                }
              },
              required: ["titulo", "artista", "capa_url", "cores", "letras"]
            }
          },
          required: ["musica"]
        }
      },
      systemInstruction: `Você é o motor de inteligência de um aplicativo de streaming de música premium.
Sua tarefa é identificar músicas e retornar SEMPRE um objeto JSON estrito.

System Rules:
1. "titulo": Official track name.
2. "artista": Main artist name.
3. "capa_url": Use a direct image URL if 100% sure it exists. OTHERWISE, you MUST use: https://picsum.photos/seed/{query_safe}/600/600 (replace {query_safe} with a URL-safe version of the song name).
4. "cores": Object with "principal" hex color.
5. "letras": Array of objects { "tempo": number (ms), "texto": string }. Provide at least 15 synchronized lines.

IMPORTANT: RETURN JSON ONLY.`
    });

    const result = await model.generateContent(`Identifique esta faixa e retorne os metadados: "${query}"`);
    const response = await result.response;
    const text = response.text();
    console.log("Raw API Response:", text);

    const data = JSON.parse(text || "{}");
    if (data.musica) {
      console.log("Successfully parsed metadata:", data.musica);
      const rawCapa = data.musica.capa_url || "";
      let finalCapa = (rawCapa.startsWith('http') && !rawCapa.includes('{'))
        ? rawCapa
        : `https://picsum.photos/seed/${encodeURIComponent(data.musica.titulo || query)}/600/600`;

      // Se a IA retornar o placeholder do picsum mas estivermos offline, 
      // ou se o picsum falhar, o componente Player já tem fallback para Music2 icon.
      // Mas aqui vamos garantir que se não houver capa, usamos nosso SVG local.
      if (!finalCapa || finalCapa.includes('{query_safe}')) {
        finalCapa = getLocalFallbackCover(data.musica.titulo || query);
      }

      return {
        titulo: data.musica.titulo,
        artista: data.musica.artista,
        capa_url: finalCapa,
        cor_dominante: data.musica.cores?.principal || "#00d4ff",
        lyrics: Array.isArray(data.musica.letras)
          ? data.musica.letras.map((l: any) => ({ time: l.tempo, text: l.texto }))
          : []
      };
    }
    console.warn("No 'musica' object found in response");
    return null;
  } catch (error) {
    console.error("Error in fetchMusicMetadata:", error);
    return null;
  }
}
