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
                }
              },
              required: ["titulo", "artista", "capa_url", "cores"]
            }
          },
          required: ["musica"]
        }
      },
      systemInstruction: `Você é o motor de inteligência de um aplicativo de streaming de música premium. 
Sua tarefa é identificar músicas e retornar SEMPRE um objeto JSON estrito.

Regras de Metadados:
1. "titulo": Nome oficial da música.
2. "artista": Nome principal do artista.
3. "capa_url": URL direta da capa (use https://picsum.photos/seed/{query_safe}/600/600 se não puder garantir uma URL real válida, onde {query_safe} é o nome da música sem espaços).
4. "cores": Objeto com a propriedade "principal" contendo um hexadecimal vibrante que combine com a arte.

IMPORTANTE: O JSON deve seguir exatamente o schema definido.`
    });

    const result = await model.generateContent(`Identifique esta faixa e retorne os metadados: "${query}"`);
    const response = await result.response;
    const text = response.text();
    console.log("Raw API Response:", text);

    const data = JSON.parse(text || "{}");
    if (data.musica) {
      console.log("Successfully parsed metadata:", data.musica);
      return {
        titulo: data.musica.titulo,
        artista: data.musica.artista,
        capa_url: data.musica.capa_url || `https://picsum.photos/seed/${encodeURIComponent(query)}/600/600`,
        cor_dominante: data.musica.cores?.principal || "#00d4ff"
      };
    }
    console.warn("No 'musica' object found in response");
    return null;
  } catch (error) {
    console.error("Error in fetchMusicMetadata:", error);
    return null;
  }
}
