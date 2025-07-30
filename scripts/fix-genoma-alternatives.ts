import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Question {
  id: string
  content: string
  correct_answer: string | null
}

interface Alternative {
  id: number
  text: string
  letter: string
}

// Function to extract alternatives from question content
function extractAlternativesFromContent(content: string): Alternative[] {
  const alternatives: Alternative[] = []
  const lines = content.split('\n')
  let counter = 0
  
  for (const line of lines) {
    // Look for patterns like "A)", "B)", "C)", "D)", "E)" or "a)", "b)", etc.
    const match = line.match(/^\s*([A-Ea-e])\)\s*(.+)$/)
    if (match) {
      const letter = match[1].toUpperCase()
      const text = match[2].trim()
      
      if (text) {
        counter++
        alternatives.push({
          id: counter,
          text: text,
          letter: letter
        })
      }
    }
  }
  
  return alternatives
}

// Function to insert alternatives for a question
async function insertQuestionAlternatives(
  questionId: string, 
  alternatives: Alternative[], 
  correctAnswer: string | null
) {
  try {
    // Delete existing alternatives
    await supabase
      .from('answer_options')
      .delete()
      .eq('question_id', questionId)
    
    // Insert new alternatives
    const alternativesToInsert = alternatives.map(alt => ({
      question_id: questionId,
      text: alt.text,
      is_correct: correctAnswer ? alt.letter === correctAnswer.toUpperCase() : false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
    
    const { error } = await supabase
      .from('answer_options')
      .insert(alternativesToInsert)
    
    if (error) {
      console.error(`Error inserting alternatives for question ${questionId}:`, error)
      return false
    }
    
    console.log(`✅ Inserted ${alternatives.length} alternatives for question ${questionId}`)
    return true
  } catch (error) {
    console.error(`Error processing question ${questionId}:`, error)
    return false
  }
}

// Main function to fix genoma bank questions
async function fixGenomaAlternatives() {
  try {
    console.log('🔍 Finding genoma bank questions without alternatives...')
    
    // Get genoma bank questions that don't have alternatives
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        id,
        content,
        correct_answer,
        answer_options!inner(question_id)
      `)
      .eq('from_genoma_bank', true)
      .is('answer_options.question_id', null)
    
    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
      return
    }
    
    // Alternative query if the above doesn't work
    const { data: allGenomaQuestions, error: allQuestionsError } = await supabase
      .from('questions')
      .select('id, content, correct_answer')
      .eq('from_genoma_bank', true)
    
    if (allQuestionsError) {
      console.error('Error fetching all genoma questions:', allQuestionsError)
      return
    }
    
    // Get questions that already have alternatives
    const { data: questionsWithAlternatives, error: altError } = await supabase
      .from('answer_options')
      .select('question_id')
    
    if (altError) {
      console.error('Error fetching existing alternatives:', altError)
      return
    }
    
    const questionIdsWithAlternatives = new Set(
      questionsWithAlternatives?.map(alt => alt.question_id) || []
    )
    
    const questionsWithoutAlternatives = allGenomaQuestions?.filter(
      q => !questionIdsWithAlternatives.has(q.id)
    ) || []
    
    console.log(`📊 Found ${questionsWithoutAlternatives.length} genoma bank questions without alternatives`)
    
    if (questionsWithoutAlternatives.length === 0) {
      console.log('✅ All genoma bank questions already have alternatives!')
      return
    }
    
    let successCount = 0
    let failCount = 0
    
    // Process each question
    for (const question of questionsWithoutAlternatives) {
      console.log(`\n🔄 Processing question ${question.id}...`)
      
      // Extract alternatives from content
      const alternatives = extractAlternativesFromContent(question.content)
      
      if (alternatives.length > 0) {
        const success = await insertQuestionAlternatives(
          question.id,
          alternatives,
          question.correct_answer
        )
        
        if (success) {
          successCount++
        } else {
          failCount++
        }
      } else {
        console.log(`⚠️  No alternatives found in content for question ${question.id}`)
        console.log(`Content preview: ${question.content.substring(0, 200)}...`)
        failCount++
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`\n📈 Summary:`)
    console.log(`✅ Successfully processed: ${successCount} questions`)
    console.log(`❌ Failed to process: ${failCount} questions`)
    
    // Verify the results
    console.log('\n🔍 Verifying results...')
    const { data: verifyData, error: verifyError } = await supabase
      .rpc('get_genoma_questions_with_alternative_count')
    
    if (!verifyError && verifyData) {
      console.log('📊 Current status of genoma bank questions:')
      console.log(verifyData)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
if (require.main === module) {
  fixGenomaAlternatives()
    .then(() => {
      console.log('\n🎉 Script completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

export { fixGenomaAlternatives, extractAlternativesFromContent, insertQuestionAlternatives }