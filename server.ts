import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize GoogleGenAI SDK safely
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

// 1. Endpoint: Problem Analysis
app.post('/api/gemini/analyze-problem', async (req: Request, res: Response) => {
  const { problemDescription, problemType, organizationType } = req.body;

  if (aiClient && apiKey) {
    try {
      const prompt = `أنت خبير نظم معلومات جغرافية (GIS) ودعم اتخاذ القرار المكاني (Spatial Decision Support System).
المطلوب تحليل وصف المشكلة المكانية التالية باللغة العربية:

نوع المشكلة: ${problemType || 'اختيار موقع جديد'}
نوع الجهة: ${organizationType || 'حكومية'}
وصف المشكلة: ${problemDescription}

يرجى إرجاع إجابة JSON صريحة بالهيكل التالي فقط:
{
  "mainObjective": "الهدف الرئيسي الواضح للمشروع",
  "spatialProblemType": "نوع المشكلة المكانية الدقيق",
  "requiredVariables": [
    {"name": "اسم المتغير", "reason": "سبب وتبرير أهمية هذا المتغير للتحليل المكاني"}
  ],
  "requiredData": [
    "اسم طبقة البيانات المطلوبة مثل شبكة الطرق، التوزيع السكاني..."
  ],
  "comparisonCriteria": [
    {"criterion": "المعيار", "suggestedWeight": 25, "impact": "positive أو negative"}
  ],
  "spatialAnalysisMethods": [
    {"method": "اسم طريقة التحليل المكاني مثل Buffer Analysis", "description": "كيف ستستخدم هذه الطريقة"}
  ],
  "expectedOutputs": [
    "المخرج المتوقع مثل خريطة نطاقات الخدمة ومصفوفة التقييم"
  ],
  "recommendationsForValidation": [
    "نصيحة حول ما يجب التحقق منه ميدانياً أو بيانات ناقصة"
  ]
}
هام: أجب بكائن JSON صالح فقط دون أي كود Markdown إضافي.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        return res.json({ success: true, analysis: parsed, source: 'gemini' });
      }
    } catch (err) {
      console.error('Error generating AI analysis:', err);
      // Fallback seamlessly to deterministic engine
    }
  }

  // Built-in GIS Domain Intelligence fallback
  const isHospital = /مستشف|صح|طوارئ|إسعاف|طبي/i.test(problemDescription);
  const isSchool = /مدرس|تعليم|جامع/i.test(problemDescription);
  const isBranch = /فرع|تجاري|تسوق|متجر|مول/i.test(problemDescription);
  const isLogistics = /لوجست|مستودع|شحن|توزيع/i.test(problemDescription);

  const fallbackAnalysis = {
    mainObjective: `تحديد وتقييم أفضل المواقع المرشحة لإنشاء ${isHospital ? 'مجمع رعاية صحية ومستشفى متكامل' : isSchool ? 'مجمع تعليمي وخدمي' : isBranch ? 'فرع تجاري وخدمي جديد' : isLogistics ? 'مركز توزيع وإمداد لوجستي' : 'مرفق حيوي جديد'} يحقق أعلى كفاءة وصول وأكبر شريحة مستفيدة.`,
    spatialProblemType: isHospital ? 'تحليل الملاءمة المكانية للمنشآت الصحية (Healthcare Facility Site Selection)' : isSchool ? 'تحليل النطاق الجغرافي والخدمي للمؤسسات التعليمية' : 'تحليل الملاءمة المكانية متعدد المعايير (MCDA - Site Suitability)',
    requiredVariables: [
      {
        name: 'الكثافة السكانية والكتلة المستهدفة',
        reason: 'ضمان خدمة التجمعات ذات الطلب العالي وقياس إجمالي المستفيدين ضمن نطاق السير والقيادة (10-15 دقيقة).'
      },
      {
        name: 'القرب من شبكة المحاور والطرق الشريانية',
        reason: 'تسهيل الوصول وسرعة زمن الاستجابة والارتباط بالمحاور السريعة دون التسبب في اختناق مروري داخلي.'
      },
      {
        name: 'المسافة عن المرافق والخدمات المماثلة القائمة',
        reason: 'تجنب التنافسية أو التكرار غير المتوازن في المناطق المخدومة وتوجيه الاستثمار للمناطق الأكثر احتياجاً.'
      },
      {
        name: 'مستوى الأمان والمخاطر المكانية والبيئية',
        reason: 'استبعاد المناطق المعرضة لمخرات السيول، أو التلوث الصناعي، أو النقاط السوداء للحوادث المرورية.'
      },
      {
        name: 'المساحة الصافية المتاحة للأرض والجاهزية التخطيطية',
        reason: 'التأكد من مطابقة الموقع للاشتراطات البنائية، وسعة مواقف السيارات، وقابلية التوسع المستقبلي.'
      }
    ],
    requiredData: [
      'طبقة التوزيع الديموغرافي والسكان على مستوى المناطق والشياخات',
      'طبقة شبكة الطرق والمحاور الرئيسية ومستويات السرعة والتكدس',
      'طبقة الخدمات القائمة (مواقع المستشفيات، المدارس، المراكز الحالية وطاقتها الاستيعابية)',
      'طبقة المواقع المرشحة المقترحة مع إحداثياتها ومساحاتها',
      'طبقة الحرم التخطيطي ومناطق المخاطر الطبيعية والبيئية'
    ],
    comparisonCriteria: [
      { criterion: 'عدد السكان المخدومين في نطاق 2 كم', suggestedWeight: 30, impact: 'positive' },
      { criterion: 'مؤشر إمكانية وسهولة الوصول من المحاور الرئيسية', suggestedWeight: 25, impact: 'positive' },
      { criterion: 'المسافة الفاصلة عن أقرب خدمة قائمة (البعد عن التكرار)', suggestedWeight: 20, impact: 'positive' },
      { criterion: 'مستوى الأمان وانخفاض المخاطر المكانية', suggestedWeight: 15, impact: 'positive' },
      { criterion: 'المساحة المتاحة والجاهزية الإنشائية', suggestedWeight: 10, impact: 'positive' }
    ],
    spatialAnalysisMethods: [
      { method: 'تحليل الحرم المكاني (Buffer Analysis)', description: 'إنشاء نطاقات 1كم و2كم و3كم حول كل بديل لحساب السكان المشمولين بالتغطية.' },
      { method: 'تحليل أقرب مرفق (Nearest Facility Analysis)', description: 'قياس المسافة الشبكية الحقيقية بين البدائل وأقرب مستشفى أو طريق رئيسي.' },
      { method: 'التحليل التطابقي متعدد المعايير (Overlay & MCDA Analysis)', description: 'دمج طبقات السكان والطرق وموانع المخاطر لتوليد نقاط جدارة مكانية موزونة.' }
    ],
    expectedOutputs: [
      'خريطة جغرافية تفاعلية توضح البدائل المرشحة مع نطاقات الحرم المكاني وشبكات الوصول',
      'مصفوفة مقارنة كمية ونوعية مرتبة حسب مجموع النقاط الموزونة',
      'لوحة تحليل ماذا لو (What-If) لاختبار حساسية النتائج لتغير أوزان المعايير',
      'تقرير تحليلي مؤسسي مدعوم بتفسير أسباب التقييم ومحددات البيانات'
    ],
    recommendationsForValidation: [
      'إجراء مسح مروري ميداني لقياس ساعات الذروة على الطرق المحيطة بالمواقع المرشحة',
      'التحقق من ملكية الأراضي وملاءمة التربة وتوفر شبكات البنية التحتية (مياه، كهرباء، صرف)',
      'تحديث التعداد السكاني التقديري إذا كانت المنطقة تشهد نمواً عمرانياً سريعاً'
    ]
  };

  return res.json({ success: true, analysis: fallbackAnalysis, source: 'builtin-engine' });
});

// 2. Endpoint: AI Assistant Chat
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  const { messages, projectContext } = req.body;
  const userMessage = messages[messages.length - 1]?.content || '';

  if (aiClient && apiKey) {
    try {
      const systemInstruction = `أنت "مساعد GeoDecision الذكي" (GeoDecision Assistant) المتخصص في نظم المعلومات الجغرافية (GIS)، التحليل المكاني، والتحليل متعدد المعايير (MCDA).
تحدث باللغة العربية بأسلوب مؤسسي رصين وواضح ومحترف.
المبادئ الحاكمة:
1. لا تتخذ القرار النهائي نيابة عن المستخدم مطلقاً، بل ساعده بفهم المعايير والبيانات والنتائج.
2. اعتمد صيغ دقيقة مثل: "وفقاً للبيانات والأوزان المحددة، تشير المؤشرات إلى..."
3. قدم شروحات حول منهجيات التحليل المكاني (Buffer, Proximity, Service Area, Density, Overlay).
4. اذكر دائماً محددات البيانات وأهمية التحقق الميداني.

سياق المشروع الحالي:
${JSON.stringify(projectContext || {}, null, 2)}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
        }
      });

      if (response.text) {
        return res.json({ success: true, reply: response.text });
      }
    } catch (err) {
      console.error('Error in chat generation:', err);
    }
  }

  // Contextual fallback response in Arabic
  let reply = '';
  if (userMessage.includes('بيانات') || userMessage.includes('مستشف')) {
    reply = `لاختيار موقع ملائم لمستشفى أو مركز رعاية صحية، تتطلب المعايير التخطيطية ونظم المعلومات الجغرافية توفير البيانات التالية:

1. **الطبقة الديموغرافية (السكان):** التوزيع السكاني التقديري، الفئات العمرية (خاصة كبار السن والأطفال)، ومعدلات النمو السكاني.
2. **الخدمات الصحية القائمة:** مواقع المستشفيات والمراكز الحالية وطاقتها الاستيعابية (عدد الأسرة) لمنع الازدواجية وتوجيه الخدمة لمناطق النقص.
3. **شبكة الطرق وسهولة الوصول:** مسارات الطرق الرئيسية، زمن الاستجابة لطوارئ الإسعاف (ضمن 8-12 دقيقة)، ومستويات الزحام.
4. **محددات الموقع وموانع الاستخدام:** خلو الموقع من مخرات السيول، البعد عن المنشآت الصناعية الملوثة، وتوفر مساحة مناسبة لمبنى المستشفى، مواقف السيارات، ومهبط طوارئ إن لزم.
5. **البنية التحتية:** توفر خطوط مياه الشرب، الصرف، وشبكات الجهد الكهربائي العالي.

نوصي بالبدء بإنشاء نطاق خدمة (Service Area) وقياس المسافة لأقرب منشأة قائمة للتحقق من المناطق المحرومة.`;
  } else if (userMessage.includes('ترتيب') || userMessage.includes('وزن') || userMessage.includes('حساسية')) {
    reply = `إن تغير ترتيب المواقع المرشحة عند تعديل الأوزان هو السلوك الأساسي في تحليل القرار المكاني متعدد المعايير (MCDA). 

عند رفع وزن معيار **"سهولة الوصول"** مثلاً من 20% إلى 40%، يحصل الموقع ذو الاتصال الأفضل بالمحاور السريعة على دفعة مضاعفة في نقاطه الإجمالية، حتى وإن كان عدد السكان حوله أقل مقارنة بموقع آخر.

هذا التحليل يُعرف بـ **"تحليل الحساسية (Sensitivity Analysis)"** عبر أداة (ماذا لو - What-If):
- يكشف لك مدى اعتماد قرارك على تفضيلات وأولويات معينة.
- ينصح الخبراء باختبار 3 سيناريوهات: (سيناريو متوازن، سيناريو يركز على خدمة أقصى عدد سكان، وسيناريو يركز على سرعة الوصول واللوجستيات).`;
  } else if (userMessage.includes('طريقة') || userMessage.includes('تحليل مكاني')) {
    reply = `أبرز طرق التحليل المكاني المناسبة للمشكلات المكانية:
1. **تحليل النطاق الجغرافي (Buffer Analysis):** لإنشاء حزام حماية أو نطاق استيعابي حول الموقع (مثل 1 كم للمشاة أو 5 كم للمركبات) لحساب السكان المستفيدين.
2. **تحليل أقرب مرفق (Nearest Facility):** لتحديد أقرب مستشفى أو محطة وقود أو طريق ومسافة الربط الشبكية.
3. **تحليل نطاق الخدمة (Service Area):** قياس المسافات بالزمن الفعلي (5 / 10 / 15 دقيقة قيادة) عبر شبكة الشوارع بدلاً من المسافة الخطية المستقيمة.
4. **التحليل التطابقي (Overlay Analysis):** تقاطع عدة طبقات مكانية لاستخراج الأراضي المتوافقة مع كافة الاشتراطات.
5. **تحليل الكثافة (Density Analysis / Heatmap):** لتحديد البؤر الساخنة للطلب أو لمناطق الخطر.`;
  } else if (userMessage.includes('تحقق') || userMessage.includes('ميدان') || userMessage.includes('موثوقية')) {
    reply = `قبل اعتماد أي نتيجة ناتجة عن هذا النظام الذكي، هناك بيانات حاسمة يجب التحقق منها ميدانياً:
1. **الوضع القانوني والملكية:** فحص عقود الملكية وسجلات الشهر العقاري والتراخيص التخطيطية.
2. **طبيعة الموقع والتربة:** معاينة التضاريس، ومناسيب الأرض، وفحص جاهزية التربة الإنشائية.
3. **السيولة المرورية الميدانية:** قياس أوقات الذروة الصباحية والمسائية عند المداخل والمخارج المقترحة.
4. **تحديث البيانات الديموغرافية:** التأكد من صحة التعداد السكاني خاصة في المجتمعات العمرانية الجديدة سريعة السكن.

تذكر دائماً: نظام GeoDecision AI هو أداة استرشادية لدعم القرار ولا يغني عن الدراسات الفنية والبيئية والميدانية المباشرة.`;
  } else {
    reply = `أهلاً بك! بصفتي مساعد GeoDecision الذكي، يمكنني مساعدتك في:
- صياغة المشكلة المكانية وتحديد المتغيرات المطلوبة.
- اقتراح أنسب أساليب التحليل الجغرافي (Buffer, Proximity, MCDA).
- تفسير أسباب تقييم كل بديل وتأثير الأوزان على الترتيب.
- توضيح مؤشرات عدم اليقين والمحددات الواجب مراعاتها قبل اتخاذ القرار.

كيف أستطيع دعم تحليلك المكاني اليوم؟`;
  }

  return res.json({ success: true, reply });
});

// Vite middleware in dev or static serve in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GeoDecision AI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
