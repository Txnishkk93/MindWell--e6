import { PrismaClient, Mood, StressLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Clean up existing data
  await prisma.surveyResponse.deleteMany({})
  await prisma.journalEntry.deleteMany({})
  await prisma.moodEntry.deleteMany({})
  await prisma.chatMessage.deleteMany({})
  await prisma.user.deleteMany({})

  // Create test user
  const hashedPassword = await bcrypt.hash('TestUser123!', 10)
  const user = await prisma.user.create({
    data: {
      email: 'test@mindwell.app',
      name: 'Amit Sharma',
      password: hashedPassword,
    },
  })

  // Create sample chat messages
  await prisma.chatMessage.createMany({
    data: [
      {
        userId: user.id,
        role: 'user',
        content: 'I am feeling overwhelmed with work and studies.',
      },
      {
        userId: user.id,
        role: 'assistant',
        content:
          'I hear you. Feeling overwhelmed is a common experience, especially when balancing multiple responsibilities. Let\'s break this down together. Can you tell me which area is contributing most to your stress right now?',
      },
      {
        userId: user.id,
        role: 'user',
        content: 'It\'s mainly the upcoming exams and project deadline.',
      },
      {
        userId: user.id,
        role: 'assistant',
        content:
          'That\'s a lot on your plate. Exams and project deadlines can create significant pressure. Have you had a chance to break these tasks into smaller, manageable steps? Sometimes focusing on one small task at a time can reduce the feeling of being overwhelmed.',
      },
    ],
  })

  // Create sample mood entries
  const today = new Date()
  await prisma.moodEntry.createMany({
    data: [
      {
        userId: user.id,
        mood: Mood.STRESSED,
        note: 'Feeling the pressure of upcoming exam',
        createdAt: new Date(today.getTime() - 0 * 24 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        mood: Mood.NEUTRAL,
        note: 'Got some rest after finishing the assignment',
        createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        mood: Mood.HAPPY,
        note: 'Great day! Project presentation went well',
        createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        mood: Mood.BURNED_OUT,
        note: 'Exhausted from back-to-back classes',
        createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        mood: Mood.STRESSED,
        note: 'Midterms stress is real',
        createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        mood: Mood.NEUTRAL,
        note: 'Feeling balanced today',
        createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        mood: Mood.HAPPY,
        note: 'Weekend time! Feeling refreshed',
        createdAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
      },
    ],
  })

  // Create sample journal entry
  await prisma.journalEntry.create({
    data: {
      userId: user.id,
      title: 'Reflections on this week',
      content: `This week has been intense. I started with a lot of anxiety about the upcoming exams, but as I worked through my study plan, I felt more in control. 

The project presentation on Wednesday went better than expected. My team worked really hard, and seeing all that effort pay off was incredibly rewarding. It reminded me that I can handle challenging situations when I take them one step at a time.

By the weekend, I was feeling burnt out. I realized I forgot to take breaks. Going forward, I need to build in self-care time more intentionally. Maybe some exercise or meditation could help balance the academic pressure.`,
      aiSummary:
        'This week showed a journey from anxiety to accomplishment, then burnout. Key themes: gaining control through planning, enjoying team success, and recognizing the need for self-care breaks. The writer is developing insight into personal patterns.',
    },
  })

  // Create sample survey response
  await prisma.surveyResponse.create({
    data: {
      userId: user.id,
      wellbeingScore: 12,
      stressorScore: 8,
      flashpointScore: 4,
      totalScore: 24,
      level: StressLevel.HIGH,
      recommendations:
        'Your burnout score indicates moderate to high stress levels. We recommend: (1) Setting clearer boundaries between study and rest time. (2) Incorporating 30-minute relaxation activities daily like meditation or yoga. (3) Speaking with a mentor or counselor about workload management. (4) Prioritizing sleep (7-9 hours) to improve resilience. You\'re showing good self-awareness by monitoring your stress levels.',
    },
  })

  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
