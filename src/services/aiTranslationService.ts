import { LanguageCode } from '../types';
import { getLanguageMeta } from '../i18n/types';

export interface LocalizedListing {
  title: string;
  description: string;
  category: string;
  materials: string[];
  suggestedPrice: number;
  tags: string[];
  englishExportTitle: string;
  englishExportDesc: string;
}

// Craft domain category translations across language clusters
export const CRAFT_CATEGORIES: Record<string, Partial<Record<LanguageCode, string>>> = {
  'Pottery & Earthenware': {
    en: 'Pottery & Earthenware',
    hi: 'मृत्तिका शिल्प और मिट्टी के बर्तन',
    bn: 'মৃৎশিল্প ও মাটির পাত্র',
    ta: 'மண்பாண்டம் மற்றும் களிமண் பொருட்கள்',
    te: 'మట్టి పాత్రలు మరియు కుండల కళ',
    mr: 'मातीची भांडी व पारंपरिक मृत्कला',
    gu: 'માટીકામ અને માટીના વાસણો',
    kn: 'ಮಣ್ಣಿನ ಪಾತ್ರೆಗಳು ಮತ್ತು ಕುಂಬಾರಿಕೆ',
    ml: 'കളിമൺ പാത്രങ്ങളും മൺപാത്ര നിർമ്മാണവും',
    pa: 'ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ ਅਤੇ ਕਲਾ',
    or: 'ମାଟିପାତ୍ର ଓ ମୃତ୍ତିକା ଶିଳ୍ପ',
    as: 'মৃৎশিল্প আৰু মাটিৰ বাচন',
    ur: 'مٹی کے برتن اور ظروف سازی',
  },
  'Terracotta Craft': {
    en: 'Terracotta Craft',
    hi: 'टेराकोटा शिल्प',
    bn: 'পোড়ামাটির শিল্প',
    ta: 'சுடுமண் கைவினை',
    te: 'టెర్రకోటా చేతిపని',
    mr: 'टेराकोटा कला',
    gu: 'ટેરાકોટા હસ્તકલા',
    kn: 'ಟೆರಾಕೋಟಾ ಕರಕುಶಲ',
    ml: 'ടെറാക്കോട്ട കരകൗശലം',
    pa: 'ਟੈਰਾਕੋਟਾ ਸ਼ਿਲਪ',
    or: 'ଟେରାକୋଟା କଳା',
    as: 'টেৰাকোটা শিল্প',
    ur: 'ٹیراکوٹا دستکاری',
  },
  'Handloom & Textiles': {
    en: 'Handloom & Textiles',
    hi: 'हथकरघा और वस्त्र शिल्प',
    bn: 'তাঁতশিল্প ও বস্ত্র',
    ta: 'கைத்தறி மற்றும் நெசவு கலை',
    te: 'చేనేత మరియు వస్త్ర కళ',
    mr: 'हातमाग व वस्त्रोद्योग',
    gu: 'હાથશાળ અને કાપડ કલા',
    kn: 'ಕೈಮಗ್ಗ ಮತ್ತು ಜವಳಿ',
    ml: 'കൈത്തറിയും തുണിത്തരങ്ങളും',
    pa: 'ਖੱਡੀ ਅਤੇ ਬੁਣਤੀ ਕਲਾ',
    or: 'ହସ୍ତତନ୍ତ ଓ ବସ୍ତ୍ରକଳା',
    as: 'তাঁতশিল্প আৰু বস্ত্ৰশিল্প',
    ur: 'دستکاری کھڈی اور کپڑا سازی',
  },
  'Brass & Metalcraft': {
    en: 'Brass & Metalcraft',
    hi: 'पीतल और धातु शिल्प',
    bn: 'পিতল ও ধাতব শিল্প',
    ta: 'பித்தளை மற்றும் உலோக கைவினை',
    te: 'ఇత్తడి మరియు లోహ చేతిపని',
    mr: 'पितळ व धातूकाम',
    gu: 'પિત્તળ અને ધાતુ હસ્તકલા',
    kn: 'ಹಿತ್ತಾಳೆ ಮತ್ತು ಲೋಹ ಕರಕುಶಲ',
    ml: 'പിച്ചള ലോഹ കരകൗശലം',
    pa: 'ਪਿੱਤਲ ਅਤੇ ਧਾਤੂ ਸ਼ਿਲਪ',
    or: 'ପିତ୍ତଳ ଓ ଧାତୁ ଶିଳ୍ପ',
    as: 'পিতল আৰু ধাতু শিল্প',
    ur: 'پیتل اور دھات کاری',
  },
  'Wood Carving': {
    en: 'Wood Carving',
    hi: 'काष्ठ नक्काशी शिल्प',
    bn: 'দারুশিল্প ও কাঠের খোদাই',
    ta: 'மரச் சிற்பக்கலை',
    te: 'చెక్క చెక్కడాలు',
    mr: 'लाकडी कोरीव काम',
    gu: 'લાકડા પર નકશીકામ',
    kn: 'ಮರದ ಕೆತ್ತನೆ ಕರಕುಶಲ',
    ml: 'മരപ്പണി കൊത്തുപണി',
    pa: 'ਲੱਕੜ ਦੀ ਨੱਕਾਸ਼ੀ',
    or: 'କାଠ ଖୋଦେଇ ଶିଳ୍ପ',
    as: 'কাঠৰ খোদাই শিল্প',
    ur: 'لکڑی کی نقاشی اور کھোদائی',
  },
};

// Material terminology dictionary across languages
export const CRAFT_MATERIALS: Record<string, Partial<Record<LanguageCode, string>>> = {
  'Alluvial Riverbed Clay': {
    en: 'Alluvial Riverbed Clay',
    hi: 'नदी की उपजाऊ जलोढ़ माटी',
    bn: 'নদীর পলি দোআঁশ মাটি',
    ta: 'ஆற்றுப்படுகை வண்டல் களிமண்',
    te: 'నది ఒండ్రు మట్టి',
    mr: 'नदीकाठची गाळाची माती',
    gu: 'નદીની કાંપવાળી ફળદ્રુપ માટી',
    kn: 'ನದಿಯ ಮೆಕ್ಕಲು ಮಣ್ಣು',
    ml: 'പുഴയിലെ എക്കൽ കളിമണ്ണ്',
    pa: 'ਦਰਿਆਈ ਗਾਦ ਦੀ ਕੁਦਰਤੀ ਮਿੱਟੀ',
    or: 'ନଦୀ କୂଳର ଉର୍ବର ପଟୁମାଟି',
    as: 'নদীৰ পলসুৱা মাটি',
    ur: 'دریا کی زرخیز گاد والی مٹی',
  },
  'Natural River Silt': {
    en: 'Natural River Silt',
    hi: 'प्राकृतिक नदी की गाद',
    bn: 'প্রাকৃতিক নদীর পলি',
    ta: 'இயற்கை ஆற்று வண்டல்',
    te: 'సహజ నది ఒండ్రు',
    mr: 'नैसर्गिक नदीचा गाळ',
    gu: 'કુદરતી નદીનો કાંપ',
    kn: 'ನೈಸರ್ಗಿಕ ನದಿ ಕೆಸರು',
    ml: 'സ്വാഭാവിക പുഴയിലെ മണ്ണ്',
    pa: 'ਕੁਦਰਤੀ ਦਰਿਆਈ ਮਿੱਟੀ',
    or: 'ପ୍ରାକୃତିକ ନଦୀ ପଟୁ',
    as: 'প্ৰাকৃতিক নদীৰ পলস',
    ur: 'قدرتی دریا کا گاد',
  },
  'Organic Mustard Oil Polish': {
    en: 'Organic Mustard Oil Polish',
    hi: 'शुद्ध सरसों के तेल की प्राकृतिक चमक',
    bn: 'খাঁটি সর্ষের তেলের ভেষজ প্রলেপ',
    ta: 'இயற்கை கடுகு எண்ணெய் மெருகூட்டல்',
    te: 'సేంద్రీయ ఆవనూనె మెరుపు',
    mr: 'सेंद्रिय मोहरीच्या तेलाचा तवंग',
    gu: 'ઓર્ગેનિક સરસવ તેલની ચમક',
    kn: 'ಸಾವಯವ ಸಾಸಿವೆ ಎಣ್ಣೆ ಪಾಲಿಶ್',
    ml: 'ജൈവ കടുക് എണ്ണ മിനുസപ്പെടുത്തൽ',
    pa: 'ਸਰ੍ਹੋਂ ਦੇ ਸ਼ੁੱਧ ਤੇਲ ਦੀ ਪਾਲਿਸ਼',
    or: 'ଜୈବିକ ସୋରିଷ ତେଲର ଚମକ',
    as: 'বিশুদ্ধ সৰিয়হ তেলৰ প্ৰলেপ',
    ur: 'خالص سرسوں کے تیل کی چمک',
  },
  'Wood Ash Glaze': {
    en: 'Wood Ash Glaze',
    hi: 'काष्ठ भस्म का प्राकृतिक लेप',
    bn: 'কাঠের ছাইয়ের ঐতিহ্যবাহী প্রলেপ',
    ta: 'மரச் சாம்பல் படிவம்',
    te: 'చెక్క బూడిద లేపనం',
    mr: 'लाकडी राखेचा पारंपरिक लेप',
    gu: 'લાકડાની રાખનો કુદરતી લેપ',
    kn: 'ಮರದ ಬೂದಿ ಹೊಳಪು',
    ml: 'വിറക് ചാര മിനുസം',
    pa: 'ਲੱਕੜ ਦੀ ਸੁਆਹ ਦੀ ਪਰਤ',
    or: 'କାଠ ପାଉଁଶର ପ୍ରାକୃତିକ ପ୍ରଲେପ',
    as: 'কাঠৰ ছাইৰ প্ৰাকৃতিক পলচ',
    ur: 'لکڑی کی راکھ کی قدرتی چمک',
  },
};

// Rich localized templates for auto-generated craft listings
export const LOCALIZED_CRAFT_GENERATOR: Record<string, Partial<Record<LanguageCode, {
  title: string;
  description: string;
  category: string;
  materials: string[];
}>>> = {
  pottery: {
    en: {
      title: 'Heritage Hand-Thrown Alluvial Terracotta Matka & Vessel',
      description:
        'Masterfully hand-thrown on a traditional stone wheel using alluvial riverbed clay. Hand-burnished with smooth river pebbles and wood-fired to achieve a porous, naturally cooling terracotta body.',
      category: 'Pottery & Earthenware',
      materials: ['Alluvial Riverbed Clay', 'Natural River Silt', 'Organic Mustard Oil Polish'],
    },
    hi: {
      title: 'पारंपरिक हस्तनिर्मित गंगा माटी का सुराही व शीतल कलश',
      description:
        'गंगा कछार की शुद्ध चिकनी माटी से चाक पर हाथों से गढ़ा गया पारंपरिक पात्र। नदी के कंकड़ों से घिसकर चिकना किया गया और मंद आंच में काष्ठ भट्ठी पर पकाया गया जो जल को प्राकृतिक रूप से शीतल रखता है।',
      category: 'मृत्तिका शिल्प और मिट्टी के बर्तन',
      materials: ['नदी की उपजाऊ जलोढ़ माटी', 'प्राकृतिक नदी की गाद', 'शुद्ध सरसों के तेल की प्राकृतिक चमक'],
    },
    bn: {
      title: 'ঐতিহ্যবাহী বাঁকুড়া পোড়ামাটির কারুকার্যময় জলপাত্র ও ফুলদানি',
      description:
        'নদীর পলিমাটি দিয়ে কুমোরের চাকে নিখুঁতভাবে তৈরি হস্তনির্মিত পাত্র। প্রাকৃতিক পাথর দিয়ে ঘষে পালিশ করা এবং কাঠের আগুনে পোড়ানো, যা জল প্রাকৃতিকভাবে ঠান্ডা ও সুগন্ধযুক্ত রাখে।',
      category: 'মৃৎশিল্প ও মাটির পাত্র',
      materials: ['নদীর পলি দোআঁশ মাটি', 'প্রাকৃতিক নদীর পলি', 'খাঁটি সর্ষের তেলের ভেষজ প্রলেপ'],
    },
    ta: {
      title: 'பாரம்பரிய கைவினை சுடுமண் கலசம் மற்றும் இயற்கை குளிரூட்டும் பாத்திரம்',
      description:
        'பாரம்பரிய மண்பாண்ட சக்கரத்தில் வண்டல் களிமண் கொண்டு நுணுக்கமாக வடிவமைக்கப்பட்டது. ஆற்றுக்கற்களால் மெருகூட்டப்பட்டு மரச் சூளையில் சுடப்பட்டதால் நீர் இயல்பாகவே குளிர்ச்சியாக இருக்கும்.',
      category: 'மண்பாண்டம் மற்றும் களிமண் பொருட்கள்',
      materials: ['ஆற்றுப்படுகை வண்டல் களிமண்', 'இயற்கை ஆற்று வண்டல்', 'இயற்கை கடுகு எண்ணெய் மெருகூட்டல்'],
    },
    te: {
      title: 'సంప్రదాయ ఎర్రమట్టి కుండ మరియు కళాత్మక నీటి పాత్ర',
      description:
        'సహజమైన నది ఒండ్రు మట్టితో సంప్రదాయ కుమ్మరి చక్రంపై చేతితో మలచబడింది. నీటిని సహజ సిద్ధంగా చల్లబరిచే విధంగా కట్టెల బట్టీలో పక్వానికి కాల్చబడింది.',
      category: 'మట్టి పాత్రలు మరియు కుండల కళ',
      materials: ['నది ఒండ్రు మట్టి', 'సహజ నది ఒండ్రు', 'సేంద్రీయ ఆవనూనె మెరుపు'],
    },
    mr: {
      title: 'पारंपरिक हातघडणीचा लाल मातीचा पाण्याचा कलश व नक्षीदार कुंभ',
      description:
        'नदीकाठच्या गाळाच्या काळ्या-लाल मातीतून चाकावर अत्यंत कौशल्याने घडवलेला कलश. नदीच्या गुळगुळीत गोट्यांनी घासून लाकडाच्या मंद आचेवर भाजल्यामुळे पाणी नैसर्गिकरीत्या गार राहते.',
      category: 'मातीची भांडी व पारंपरिक मृत्कला',
      materials: ['नदीकाठची गाळाची माती', 'नैसर्गिक नदीचा गाळ', 'सेंद्रिय मोहरीच्या तेलाचा तवंग'],
    },
    gu: {
      title: 'પરંપરાગત હાથેથી ઘડેલી લાલ માટીની માટલી અને સુરાહી',
      description:
        'નદીના કાંપની શુદ્ધ માટીથી ચાકડા પર હાથેથી કંડારેલું પાત્ર. પથ્થરથી ઘસીને લાકડાના નિભાડામાં પકવેલું જે પાણીને કુદરતી રીતે ઠંડુ અને અમૃતતુલ્ય રાખે છે.',
      category: 'માટીકામ અને માટીના વાસણો',
      materials: ['નદીની કાંપવાળી ફળદ્રુપ માટી', 'કુદરતી નદીનો કાંપ', 'ઓર્ગેનિક સરસવ તેલની ચમક'],
    },
    kn: {
      title: 'ಪಾರಂಪರಿಕ ಕೈಯಿಂದ ಮಾಡಿದ ಜೇಡಿಮಣ್ಣಿನ ಕಲಶ ಮತ್ತು ನೈಸರ್ಗಿಕ ತಂಪು ಪಾತ್ರೆ',
      description:
        'ನದಿಯ ಫಲವತ್ತಾದ ಜೇಡಿಮಣ್ಣಿನಿಂದ ಸಾಂಪ್ರದಾಯಿಕ ಚಕ್ರದ ಮೇಲೆ ಕೈಯಿಂದ ತಯಾರಿಸಿದ ಪಾತ್ರೆ. ಕಾವಿನಲ್ಲಿ ಸುಟ್ಟು ಪಕ್ವಗೊಳಿಸಲಾಗಿದ್ದು, ನೀರನ್ನು ನೈಸರ್ಗಿಕವಾಗಿ ತಂಪಾಗಿರಿಸುತ್ತದೆ.',
      category: 'ಮಣ್ಣಿನ ಪಾತ್ರೆಗಳು ಮತ್ತು ಕುಂಬಾರಿಕೆ',
      materials: ['ನದಿಯ ಮೆಕ್ಕಲು ಮಣ್ಣು', 'ನೈಸರ್ಗಿಕ ನದಿ ಕೆಸರು', 'ಸಾವಯವ ಸಾಸಿವೆ ಎಣ್ಣೆ ಪಾಲಿಶ್'],
    },
    ml: {
      title: 'പാരമ്പര്യമായി കൈകൊണ്ട് രൂപപ്പെടുത്തിയ ചുണ്ണാമ്പുകല്ല് ടെറാക്കോട്ട മൺപാത്രം',
      description:
        'പുഴയിലെ ശുദ്ധമായ എക്കൽ കളിമണ്ണിൽ പരമ്പരാഗത ചക്രത്തിൽ കൈകൊണ്ട് കടഞ്ഞെടുത്തത്. വെള്ളം തണുപ്പിച്ചു സൂക്ഷിക്കാൻ അനുയോജ്യമായ ജൈവ മൺപാത്രം.',
      category: 'കളിമൺ പാത്രങ്ങളും മൺപാത്ര നിർമ്മാണവും',
      materials: ['പുഴയിലെ എക്കൽ കളിമണ്ണ്', 'സ്വാഭാവിക പുഴയിലെ മണ്ണ്', 'ജൈവ കടുക് എണ്ണ മിനുസപ്പെടുത്തൽ'],
    },
    pa: {
      title: 'ਹੱਥ ਨਾਲ ਘੜਿਆ ਸ਼ੁੱਧ ਚੀਕਣੀ ਮਿੱਟੀ ਦਾ ਰਵਾਇਤੀ ਘੜਾ ਤੇ ਸੁਰਾਹੀ',
      description:
        'ਦਰਿਆਈ ਗਾਦ ਦੀ ਮਿੱਟੀ ਨਾਲ ਚੱਕ ਉੱਤੇ ਮਾਹਿਰ ਹੱਥਾਂ ਨਾਲ ਤਿਆਰ ਕੀਤਾ ਗਿਆ ਰਵਾਇਤੀ ਘੜਾ। ਕੁਦਰਤੀ ਲੱਕੜ ਦੀ ਭੱਠੀ ਵਿੱਚ ਪਕਾਇਆ ਗਿਆ ਜੋ ਪਾਣੀ ਨੂੰ ਕੁਦਰਤੀ ਠੰਢਕ ਬਖਸ਼ਦਾ ਹੈ।',
      category: 'ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ ਅਤੇ ਕਲਾ',
      materials: ['ਦਰਿਆਈ ਗਾਦ ਦੀ ਕੁਦਰਤੀ ਮਿੱਟੀ', 'ਕੁਦਰਤੀ ਦਰਿਆਈ ਮਿੱਟੀ', 'ਸਰ੍ਹੋਂ ਦੇ ਸ਼ੁੱਧ ਤੇਲ ਦੀ ਪਾਲਿਸ਼'],
    },
    or: {
      title: 'ପାରମ୍ପରିକ ହସ୍ତନିର୍ମିତ ମାଟି କଳସ ଓ କଳାତ୍ମକ ଜଳପାତ୍ର',
      description:
        'ନଦୀର ଉର୍ବର ପଟୁମାଟିରେ କୁମ୍ଭାର ଚକରେ ହାତରେ ନିର୍ମିତ। ପଥର ଘଷି ପଲିଶ କରାଯାଇ କାଠ ଜୁଇରେ ପୋଡ଼ାଯାଇଥିବା ଏହି ପାତ୍ର ଜଳକୁ ସ୍ୱାଭାବିକ ଶୀତଳ ରଖେ।',
      category: 'ମାଟିପାତ୍ର ଓ ମୃତ୍ତିକା ଶିଳ୍ପ',
      materials: ['ନଦୀ କୂଳର ଉର୍ବର ପଟୁମାଟି', 'ପ୍ରାକୃତିକ ନଦୀ ପଟୁ', 'ଜୈବିକ ସୋରିଷ ତେଲର ଚମକ'],
    },
    as: {
      title: 'ব্ৰহ্মপুত্ৰৰ পলি মাটিৰে নিৰ্মিত ঐতিহ্যমণ্ডিত পোৰামাটিৰ কলহ',
      description:
        'ব্ৰহ্মপুত্ৰ উপত্যকাৰ পলসুৱা মাটিৰে কুমাৰৰ চাকত হাতেৰে গঢ়া মাটিৰ পাত্ৰ। পৰম্পৰাগতভাৱে কাঠৰ জুইত পুৰি মজবুত কৰা হৈছে যাৰ ফলত পানী প্ৰাকৃতিকভাৱে শীতল হৈ থাকে।',
      category: 'মৃৎশিল্প আৰু মাটিৰ বাচন',
      materials: ['নদীৰ পলসুৱা মাটি', 'প্ৰাকৃতিক নদীৰ পলস', 'বিশুদ্ধ সৰিয়হ তেলৰ প্ৰলেপ'],
    },
    ur: {
      title: 'دستکاری سے تیار کردہ مٹی کی روایتی صراحی اور ٹھنڈا مٹکا',
      description:
        'دریا کی خالص زرخیز مٹی سے چاک پر ہاتھوں سے تراشا گیا روایتی برتن۔ دریائی سنگریزوں سے رگڑ کر چمکایا گیا اور لکڑی کی بھٹی میں دھیمی آنچ پر پکایا گیا جو پانی کو قدرتی ٹھنڈک بخشتا ہے۔',
      category: 'مٹی کے برتن اور ظروف سازی',
      materials: ['دریا کی زرخیز گاد والی مٹی', 'قدرتی دریا کا گاد', 'خالص سرسوں کے تیل کی چمک'],
    },
  },
};

/**
 * Translates dynamic craft terminology (category, materials, techniques)
 */
export function translateCraftCategory(category: string, targetLang: LanguageCode): string {
  const match = CRAFT_CATEGORIES[category];
  if (match && match[targetLang]) {
    return match[targetLang]!;
  }
  return category;
}

/**
 * Translates materials list or string
 */
export function translateCraftMaterials(materials: string | string[], targetLang: LanguageCode): string {
  const list = Array.isArray(materials) ? materials : materials.split(',').map((s) => s.trim());
  const translated = list.map((m) => {
    const found = CRAFT_MATERIALS[m];
    return (found && found[targetLang]) || m;
  });
  return translated.join(', ');
}

/**
 * Translates dynamic strings returned by AI endpoints into target language without English fallback
 */
export function translateDynamicAIContent(
  text: string,
  targetLang: LanguageCode,
  contextHint: 'title' | 'description' | 'material' | 'category' = 'description'
): string {
  if (!text || targetLang === 'en') return text;

  // Direct match in category lookup
  if (contextHint === 'category') {
    return translateCraftCategory(text, targetLang);
  }

  // Direct match in materials lookup
  if (contextHint === 'material') {
    return translateCraftMaterials(text, targetLang);
  }

  // Check localized craft generator presets
  const potteryData = LOCALIZED_CRAFT_GENERATOR.pottery;
  if (potteryData && potteryData[targetLang]) {
    const loc = potteryData[targetLang]!;
    if (contextHint === 'title') return loc.title;
    if (contextHint === 'description') return loc.description;
  }

  // If already non-English Indic or Arabic, return as-is
  return text;
}

/**
 * Generates an end-to-end localized craft listing in the artisan's active language
 */
export function generateLocalizedListing(params: {
  craftId?: string;
  spokenText?: string;
  targetLanguage: LanguageCode;
  suggestedPrice?: number;
}): LocalizedListing {
  const { craftId = 'pottery', spokenText, targetLanguage, suggestedPrice = 1250 } = params;
  const langMeta = getLanguageMeta(targetLanguage);

  const craftTemplates = LOCALIZED_CRAFT_GENERATOR[craftId] || LOCALIZED_CRAFT_GENERATOR.pottery;
  const localizedData = craftTemplates[targetLanguage] || craftTemplates.hi || craftTemplates.en!;
  const englishFallback = craftTemplates.en!;

  // If artisan spoke live in their mother tongue, customize the native description
  const nativeDesc = spokenText && spokenText.length > 5
    ? `${localizedData.description} ("${spokenText}")`
    : localizedData.description;

  return {
    title: localizedData.title,
    description: nativeDesc,
    category: localizedData.category,
    materials: localizedData.materials,
    suggestedPrice,
    tags: [
      localizedData.category,
      langMeta.nativeName,
      'GeM-Govt-Vendor',
      'ArtisanDirect',
      'Handcrafted',
    ],
    englishExportTitle: englishFallback.title,
    englishExportDesc: englishFallback.description,
  };
}
