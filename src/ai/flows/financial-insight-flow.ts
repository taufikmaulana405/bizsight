
'use server';
/**
 * @fileOverview A financial insight generation AI agent.
 *
 * - generateFinancialInsight - A function that generates a concise financial insight.
 * - FinancialInsightInput - The input type for the generateFinancialInsight function.
 * - FinancialInsightOutput - The return type for the generateFinancialInsight function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MonthlyDataSchema = z.object({
  name: z.string().describe('Month name (e.g., "Jan", "Feb")'),
  income: z.number().describe('Total income for the month'),
  expenses: z.number().describe('Total expenses for the month'),
  // Profit will be calculated in the flow, not part of the input schema for monthlyData
});

const FinancialInsightInputSchema = z.object({
  totalRevenue: z.number().describe('The total revenue.'),
  totalExpenses: z.number().describe('The total expenses.'),
  totalProfit: z.number().describe('The total profit (revenue - expenses).'),
  monthlyData: z.array(MonthlyDataSchema).describe('Array of income and expenses for recent months. Should be the last few months, ideally 3-6.').optional(),
});
export type FinancialInsightInput = z.infer<typeof FinancialInsightInputSchema>;

const FinancialInsightOutputSchema = z.object({
  insight: z
    .string()
    .describe(
      'A concise (1-3 sentences) financial insight or observation based on the provided data. Focus on being helpful and actionable if possible.'
    ),
});
export type FinancialInsightOutput = z.infer<typeof FinancialInsightOutputSchema>;

export async function generateFinancialInsight(
  input: FinancialInsightInput
): Promise<FinancialInsightOutput> {
  return financialInsightFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialInsightPrompt',
  input: {schema: FinancialInsightInputSchema.extend({
    // We augment monthlyData with profit in the flow, so the prompt can expect it.
    // This part of the schema is for the data *as sent to the prompt*, not the flow's external input.
    monthlyData: z.array(MonthlyDataSchema.extend({
      profit: z.number().describe('Calculated profit for the month (income - expenses)')
    })).optional(),
  })},
  output: {schema: FinancialInsightOutputSchema},
  prompt: `You are a helpful financial assistant for a small business owner using the BizSight app.
Analyze the following financial data and provide a concise (1-3 sentences) insight or observation.
Focus on identifying key trends, areas of concern, or positive developments.
If possible, make it actionable or suggest something to look into.

Financial Summary:
- Total Revenue: \${{totalRevenue}}
- Total Expenses: \${{totalExpenses}}
- Net Profit: \${{totalProfit}}

{{#if monthlyData.length}}
Recent Monthly Performance:
{{#each monthlyData}}
- {{this.name}}: Income: \${{this.income}}, Expenses: \${{this.expenses}}, Profit: \${{this.profit}}
{{/each}}
{{else}}
(No recent monthly data provided for trend analysis)
{{/if}}

Based on this, what is one key insight or observation you can share?
Be empathetic and encouraging. If data is sparse or all zero, acknowledge that and perhaps suggest adding more data for better insights.
Example for sparse data: "It looks like you're just getting started or haven't entered much data yet. Keep tracking your finances to get a clearer picture!"
Example for good profit: "Great job on maintaining a healthy profit margin! Revenue is strong compared to expenses."
Example for high expenses: "Your revenue is solid, but expenses are also quite high. It might be worth reviewing spending in key categories."
Example for trend: "There's a positive trend in your income over the past few months, keep up the great work!"
`,
});

const financialInsightFlow = ai.defineFlow(
  {
    name: 'financialInsightFlow',
    inputSchema: FinancialInsightInputSchema,
    outputSchema: FinancialInsightOutputSchema,
  },
  async (input) => {
    // Basic check for mostly zero data to provide a specific tailored insight.
    if (input.totalRevenue === 0 && input.totalExpenses === 0 && input.totalProfit === 0 && (!input.monthlyData || input.monthlyData.length === 0)) {
      return { insight: "It looks like you're just getting started or haven't entered much financial data yet. Add some income and expenses to start seeing valuable insights!" };
    }

    // Create a mutable copy of the input to process monthlyData
    const processedInput = { ...input };
    
    if (processedInput.monthlyData && processedInput.monthlyData.length > 0) {
      // Augment monthlyData with profit
      // Need to cast to 'any' to add the profit property for the prompt,
      // or define an intermediate type. Casting is simpler here as prompt input schema is extended.
      processedInput.monthlyData = processedInput.monthlyData.map(month => ({
        ...month,
        profit: month.income - month.expenses,
      })) as any;
    }
    
    const {output} = await prompt(processedInput);
    if (!output) {
        throw new Error("Failed to generate financial insight. The AI model did not return an output.");
    }
    return output;
  }
);

