import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
      (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
      "";
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export interface MusicMetadata {
  titulo: string;
  artista: string;
  capa_url: string;
  cor_dominante: string;
}

export async function fetchMusicMetadata(query: string): Promise<MusicMetadata | null> {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Processar solicitação de música: "${query}". Retornar metadados precisos.`,
      config: {
        systemInstruction: `Você é o motor de inteligência de um aplicativo de streaming de música. 
Sua tarefa é processar solicitações de músicas e retornar SEMPRE um objeto JSON que contenha os metadados da faixa.

Ao identificar uma música, você deve fornecer:
1. "titulo": Nome da música.
2. "artista": Nome do cantor ou banda.
3. "capa_url": Um link direto para a imagem da capa do álbum (use https://picsum.photos/seed/{seed}/600/600 como placeholder se não tiver uma URL real, trocando {seed} pelo nome da música).
4. "cor_dominante": Um código hexadecimal que combine com a arte da capa.

Formato de saída estrito:
{
  "musica": {
    "titulo": "Nome",
    "artista": "Artista",
    "capa_url": "URL_DA_IMAGEM",
    "cores": { "principal": "#HEX" }
  }
}`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            musica: {
              type: Type.OBJECT,
              properties: {
                titulo: { type: Type.STRING },
                artista: { type: Type.STRING },
                capa_url: { type: Type.STRING },
                cores: {
                  type: Type.OBJECT,
                  properties: {
                    principal: { type: Type.STRING }
                  },
                  required: ["principal"]
                }
              },
              required: ["titulo", "artista", "capa_url", "cores"]
            }
          },
          required: ["musica"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    if (data.musica) {
      return {
        titulo: data.musica.titulo,
        artista: data.musica.artista,
        capa_url: data.musica.capa_url,
        cor_dominante: data.musica.cores.principal
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching music metadata:", error);
    return null;
  }
}
