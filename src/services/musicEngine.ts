import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

let aiInstance: GoogleGenerativeAI | null = null;

function getAI(): GoogleGenerativeAI {
  if (!aiInstance) {
    const apiKey =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
      (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
      "";
    aiInstance = new GoogleGenerativeAI(apiKey);
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
    const genAI = getAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
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
                }
              },
              required: ["titulo", "artista", "capa_url", "cores"]
            }
          },
          required: ["musica"]
        }
      },
      systemInstruction: `Você é o motor de inteligência de um aplicativo de streaming de música. 
Sua tarefa é processar solicitações de músicas e retornar SEMPRE um objeto JSON que contenha os metadados da faixa.

Ao identificar uma música, você deve fornecer:
1. "titulo": Nome da música.
2. "artista": Nome do cantor ou banda.
3. "capa_url": Um link direto para a imagem da capa do álbum (use https://picsum.photos/seed/{seed}/600/600 como placeholder se não tiver uma URL real, trocando {seed} pelo nome da música).
4. "cor_dominante": Um código hexadecimal que combine com a arte da capa.

O formato deve ser estrito conforme o schema definido.`
    });

    const result = await model.generateContent(`Processar solicitação de música: "${query}". Retornar metadados precisos.`);
    const response = await result.response;
    const text = response.text();

    const data = JSON.parse(text || "{}");
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
