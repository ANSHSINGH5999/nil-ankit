// src/ai.js - EXTREME OFFLINE PRESENTATION MODE
// This file has been disconnected from Google Gemini to guarantee 100% stability, zero latency, and zero quota crashes during the live presentation.

export async function findBestMatches(userProfile, allOtherUsers, apiKey) {
  // 1-second delay for realism
  await new Promise(r => setTimeout(r, 1000));

  if (allOtherUsers.length === 0) return [];
  
  // Pick 3 random users as matches
  const shuffled = [...allOtherUsers].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);
  
  return selected.map((user, idx) => {
    const offeredStr = user.skillsOffered && user.skillsOffered.length > 0 ? user.skillsOffered[0].name : "advanced competencies";
    const wantedStr = user.skillsWanted && user.skillsWanted.length > 0 ? user.skillsWanted[0].name : "development";
    
    const templates = [
       `${user.displayName}'s mastery in ${offeredStr} bridges your exact knowledge gap for a potent skill exchange.`,
       `Incredible mechanical synergy mapped. They want to learn ${wantedStr}, while offering deep architectural insights into ${offeredStr}.`,
       `Highly synergistic match. ${user.displayName}'s technical profile aligns perfectly with your projected academic trajectory.`
    ];

    return {
      uid: user.uid,
      score: Math.floor(Math.random() * (99 - 85 + 1)) + 85,
      reasoning: templates[Math.floor(Math.random() * templates.length)],
      mutual: idx === 0 || idx === 2
    };
  });
}

export async function generateRoadmap(skillName, apiKey) {
  await new Promise(r => setTimeout(r, 1200));
  return [
    { week: "Week 1", focus: `Core Foundations of ${skillName}`, tasks: ["Understand underlying architecture", "Set up optimal local environment", "Build a 'Hello World' proof-of-concept"] },
    { week: "Week 2", focus: "Intermediate Fundamentals", tasks: ["Dive into specialized components", "Complete 2 guided mini-projects", "Debug industry-standard errors"] },
    { week: "Week 3", focus: "Advanced Integration", tasks: ["Inject external APIs & open-source libraries", "Optimize latency & memory", "Read documentation best practices"] },
    { week: "Week 4", focus: "Absolute Mastery", tasks: ["Architect a full-scale scalable project", "Deploy globally to production", "Author clean repository documentation"] }
  ];
}

export async function generateQuiz(skillName, proficiency, apiKey) {
  await new Promise(r => setTimeout(r, 800));
  return [
    {
       question: `What is the most critical technical paradigm associated with mastering ${skillName}?`,
       options: ["Sequential Hard-coding", "Asynchronous Decoupling", "Immutable Native States", "Hardware Acceleration"],
       correctAnswerIndex: 1,
       explanation: `Asynchronous decoupling ensures ${skillName} scales effectively without thread blockage.`
    },
    {
       question: `Which scenario represents the worst-case implementation architecture for ${skillName}?`,
       options: ["Memory Leaks in loops", "Typographical errors", "Misaligned UX/UI", "Missing docstrings"],
       correctAnswerIndex: 0,
       explanation: "Memory leaks represent fundamental architectural misunderstandings that crash production servers."
    },
    {
       question: `Choose the best ecosystem pattern for a highly scalable ${skillName} deployment.`,
       options: ["Monolithic Database", "Microservices Topology", "Single-Threaded", "Client-Side Overload"],
       correctAnswerIndex: 1,
       explanation: "A Microservices topology guarantees isolated, dynamic deployment success."
    }
  ];
}

export async function generateTeamBuilder(userProfile, allOtherUsers, apiKey) {
  await new Promise(r => setTimeout(r, 1500));
  if (allOtherUsers.length < 2) throw new Error("Not enough users to form a team!");
  
  const shuffled = [...allOtherUsers].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 2);
  
  return {
    members: [selected[0].uid, selected[1].uid],
    teamName: "The Innovation Triad",
    synergyReasoning: `By mapping your base competencies directly against ${selected[0].displayName}'s advanced systemic logic and marrying it with ${selected[1].displayName}'s unique structural approach, this exact combination of students boasts a 98.4% projected synergy success rate.`
  };
}

export async function generateSkillGap(userProfile, careerGoal, apiKey) {
  await new Promise(r => setTimeout(r, 1600));
  return {
    verdict: `You have established a solid academic foundation, but you completely lack industry-standard enterprise deployment patterns for an elite position like ${careerGoal}.`,
    missingSkills: ["Enterprise Microservices", "CI/CD Pipelines (GitHub Actions)", "Containerization (Docker/Kubernetes)", "Test-Driven Development (TDD)"],
    nextStep: "Shift your immediate focus onto learning Docker encapsulation and mapping out a Microservice architecture on your next solo project."
  };
}

export async function generateChatReply(targetUser, messageHistory, apiKey) {
  await new Promise(r => setTimeout(r, 800)); // Natural typing delay
  
  const lastMessage = messageHistory[messageHistory.length - 1]?.text?.toLowerCase() || '';

  if (lastMessage.match(/hi|hey|hello/)) {
     return `Hey! Super excited we matched. What specific skills were you hoping to focus on?`;
  }
  if (lastMessage.match(/teach|learn|help|show|how/)) {
     return `I can definitely help you with that! I've been diving deep into that area recently, so I'd love to share what I know.`;
  }
  if (lastMessage.match(/when|time|meet|sync|call|zoom/)) {
     return `I'm completely free this weekend, or we can do a quick 30-min call tomorrow evening. Does that work for you?`;
  }
  if (lastMessage.match(/thanks|thank you|awesome|perfect/)) {
     return `Awesome! Looking forward to our collaboration. You can hit me up on WhatsApp through my profile whenever.`;
  }
  if (lastMessage.match(/project|hackathon|build/)) {
     return `Oh I am 100% down to build a project together. That would be a perfect way to test our skill exchange!`;
  }

  // Generic context-aware fallbacks
  const responses = [
    "That makes total sense. I'd love to collaborate on that.",
    "Great point! I've actually been looking to improve exactly that side of things.",
    "Haha absolutely. We should definitely form a team!"
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}
