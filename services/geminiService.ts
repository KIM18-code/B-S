
import { GoogleGenAI, Tool } from "@google/genai";
import { AnalysisResult, CustomerProfile, GroundingLink, MatchResult, PropertyInput } from "../types";

const API_KEY = process.env.GEMINI_API_KEY || '';

// Initialize without creating client immediately to allow for key check if needed, 
// though per prompt instructions we assume process.env.API_KEY is available.
const createClient = () => new GoogleGenAI({ apiKey: API_KEY });

export const analyzeProperty = async (input: PropertyInput): Promise<AnalysisResult> => {
  const ai = createClient();
  
  const systemInstruction = `
    Bạn là Deal-Intelligence-AI chuyên phân tích bất động sản Việt Nam.
    Nhiệm vụ:
    1. Phân tích tọa độ, địa hình, độ cao của địa chỉ được cung cấp. NẾU CÓ HÌNH ẢNH: Hãy phân tích kỹ đặc điểm thị giác (cây cối, độ dốc, tầm nhìn) để gợi ý mô hình kinh doanh sát thực tế.
    2. Phân tích rủi ro khí hậu (ngập, hạn, nhiệt độ tăng, cháy rừng) tại khu vực đó ở Việt Nam.
    3. Ước tính giá trị thị trường (theo tỷ giá VND) dựa trên so sánh khu vực thực tế.
    4. Phân tích xu hướng thị trường: Giá trung bình/m2, lịch sử biến động giá trong 3-5 năm qua, và dự báo tương lai.
    5. Đề xuất công năng: ở, đầu tư, farmstay, homestay.
    6. Cho điểm Investment Score (1–100).
    
    Hãy sử dụng Google Maps và Google Search để tìm dữ liệu thực tế mới nhất về giá cả và quy hoạch.
    
    OUTPUT FORMAT:
    Trả về một JSON object nằm trong khối code markdown \`\`\`json ... \`\`\`.
    Cấu trúc JSON bắt buộc:
    {
      "coordinates": { "lat": number, "lng": number },
      "terrainAnalysis": "string describing terrain and elevation",
      "climateRisks": {
        "flood": number (1-10),
        "heat": number (1-10),
        "drought": number (1-10),
        "forestFire": number (1-10)
      },
      "marketValueEstimation": {
        "min": number (in Billion VND),
        "max": number (in Billion VND),
        "currency": "VND"
      },
      "marketAnalysis": {
        "averagePricePerM2": "string (ví dụ: '80 - 100 triệu/m2')",
        "historicalTrends": [
          { 
            "timeline": "string (Năm/Giai đoạn)", 
            "priceTrend": "string (Giá hoặc % thay đổi)", 
            "description": "string (Ngắn gọn)",
            "newsContext": "string (Tóm tắt tin tức hoặc sự kiện thị trường/hạ tầng nổi bật thời điểm đó gây ảnh hưởng giá)"
          }
        ],
        "futureProjections": "string (Dự báo ngắn gọn về tiềm năng tăng giá)"
      },
      "suggestedFunctions": ["string", "string"],
      "investmentScore": number (1-100),
      "reasoning": "string explaining the analysis"
    }
  `;

  const promptText = `Phân tích bất động sản sau tại Việt Nam:
  - Địa chỉ: ${input.address}
  ${input.locationUrl ? `- Link Google Maps/Vị trí: ${input.locationUrl}` : ''}
  - Loại hình: ${input.type}
  - Diện tích: ${input.area} m2
  - Giá chào bán: ${input.price} tỷ VND
  - Mô tả thêm: ${input.description}
  
  Yêu cầu:
  - Nếu có hình ảnh đính kèm, hãy dùng thị giác máy tính để phân tích hiện trạng lô đất (đất trống, nhà cũ, view đồi/sông...) để đề xuất công năng phù hợp nhất (VD: Farmstay nếu nhiều cây, Cafe nếu view đẹp).
  - Tìm kiếm dữ liệu thị trường mới nhất về giá khu vực này.
  - Nếu thiếu thông tin cụ thể, hãy tự suy luận hợp lý dựa trên dữ liệu thị trường phổ biến tại quận/huyện đó.`;

  const tools: Tool[] = [
    { googleSearch: {} },
    { googleMaps: {} }
  ];

  // Attempt to get user location for better maps grounding context
  let toolConfig = undefined;
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
      }
    };
  } catch (e) {
    console.warn("Geolocation not available, proceeding without user location context.");
  }

  // Construct parts
  const parts: any[] = [{ text: promptText }];

  // Add image if exists
  if (input.images && input.images.length > 0) {
    const base64Data = input.images[0]; // Take the first image
    // Need to strip the prefix "data:image/jpeg;base64," to get just the base64 string
    const match = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
      tools,
      toolConfig: toolConfig || undefined,
      temperature: 0.4,
    },
    contents: { parts }
  });

  const text = response.text || '';
  
  // Extract JSON
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```json\s+([\s\S]*?)\s+```/);
  let parsedData: any = {};
  
  if (jsonMatch && jsonMatch[1]) {
    try {
      parsedData = JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error("Failed to parse JSON from AI response", e);
      throw new Error("AI response was not valid JSON.");
    }
  } else {
     // Fallback if no code block found, try parsing whole text if it looks like JSON
     try {
       parsedData = JSON.parse(text);
     } catch(e) {
        throw new Error("Could not extract JSON analysis from response.");
     }
  }

  // Extract grounding metadata
  const groundingLinks: GroundingLink[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  chunks.forEach((chunk: any) => {
    if (chunk.web?.uri) {
      groundingLinks.push({
        title: chunk.web.title || 'Web Source',
        uri: chunk.web.uri,
        source: 'search'
      });
    }
    // Handle Maps grounding if structured differently in future versions or strict checking
  });

  return {
    ...parsedData,
    groundingLinks
  };
};

export const matchCustomer = async (property: PropertyInput, analysis: AnalysisResult, customer: CustomerProfile): Promise<MatchResult> => {
  const ai = createClient();

  const systemInstruction = `
    Bạn là Customer-Matching-AI, hệ thống ghép khách hàng với BĐS tại Việt Nam.
    Nhiệm vụ:
    1. So khớp nhu cầu khách hàng với đặc điểm sản phẩm.
    2. Tính Matching Score (1-100).
    3. Giải thích lý do.
    4. Đưa ra khuyến nghị (Có/Không nên mua).
    
    Hãy trả về JSON thuần túy (không markdown nếu có thể, hoặc bọc markdown json).
  `;

  const prompt = `
    Dữ liệu BĐS:
    - Địa chỉ: ${property.address}
    - Giá: ${property.price} tỷ VND
    - Diện tích: ${property.area} m2
    - Điểm đầu tư (Deal AI): ${analysis.investmentScore}
    - Rủi ro khí hậu: ${JSON.stringify(analysis.climateRisks)}
    - Công năng: ${analysis.suggestedFunctions.join(', ')}
    - Xu hướng thị trường: ${JSON.stringify(analysis.marketAnalysis)}
    
    Dữ liệu Khách hàng:
    - Ngân sách: ${customer.budget} tỷ VND
    - Mục đích: ${customer.purpose}
    - Khẩu vị rủi ro: ${customer.riskTolerance}
    - Phong cách sống: ${customer.lifestyle}
    
    Hãy phân tích và trả về JSON:
    {
      "matchingScore": number,
      "explanation": "string",
      "recommendation": boolean,
      "top3Products": ["string (ví dụ: 'Căn này', 'Khu vực lân cận A', 'Dự án B')"]
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
      responseMimeType: 'application/json' // We can use this here as we aren't using tools for this step
    },
    contents: prompt
  });

  const text = response.text || '{}';
  return JSON.parse(text) as MatchResult;
};