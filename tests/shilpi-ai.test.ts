import assert from 'node:assert/strict';
import { buildShilpiSystemInstruction } from '../server/ai';
import { generateArtisanAIResponse } from '../src/services/shilpiAiService';

const artisan = {
  name: 'Meera Devi',
  title: 'Master Artisan',
  location: 'Kutch, Gujarat',
  craft: 'Hand-carved wood',
  avatarUrl: '',
  completeness: 90,
  trustScore: 96,
  gemVerified: true,
  storyQuote: '',
  bio: '',
};

const instruction = buildShilpiSystemInstruction({
  targetLanguageName: 'English',
  artisanContext: artisan,
  inventorySummary: 'Box: 2 units left',
});

assert.match(instruction, /GOLDEN FORMULA/);
assert.match(instruction, /GeM AND INSTITUTIONAL B2B/);
assert.match(instruction, /4K CATALOG/);
assert.match(instruction, /answer briefly if safe and useful, then pivot/i);
assert.match(instruction, /Respond entirely in English/);

const priced = generateArtisanAIResponse('How should I price this?', {
  artisan,
  language: 'en',
  pricingInputs: {
    materialCost: 500,
    laborHours: 4,
    hourlyRate: 200,
    heritagePremiumPercentage: 10,
    marginPercentage: 20,
  },
});
assert.match(priced.reply, /Materials: ₹500/);
assert.match(priced.reply, /Suggested fair price: ₹1,716/);

const pivot = generateArtisanAIResponse('What is the weather today?', {
  artisan,
  language: 'en',
});
assert.match(pivot.reply, /workshop|fair .*price|GeM\/B2B|4K catalog/i);

console.log('SHILPI AI tests passed');
