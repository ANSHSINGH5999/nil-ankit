import { db } from '../firebase';
import { ref, set } from 'firebase/database';

export async function seedFakeUsers() {
  const fakeUsers = [
    {
      uid: "fake_arjun_k",
      displayName: "Arjun Kumar",
      email: "arjun@university.edu.in",
      phoneNumber: "WAITING_FOR_NUMBER_1", 
      skillsOffered: [{name: "React.js", proficiency: "Advanced"}, {name: "Node.js", proficiency: "Intermediate"}],
      skillsWanted: [{name: "Cloud Architecture (AWS)", proficiency: "Beginner"}],
      isFake: true
    },
    {
      uid: "fake_anya_m",
      displayName: "Anya Menon",
      email: "anya@university.edu.in",
      phoneNumber: "WAITING_FOR_NUMBER_2", 
      skillsOffered: [{name: "UI/UX Design (Figma)", proficiency: "Advanced"}, {name: "Framer Motion", proficiency: "Advanced"}],
      skillsWanted: [{name: "Backend Engineering", proficiency: "Beginner"}],
      isFake: true
    },
    {
      uid: "fake_rohan_d",
      displayName: "Rohan Deshmukh",
      email: "rohan@university.edu.in",
      phoneNumber: "WAITING_FOR_NUMBER_3", 
      skillsOffered: [{name: "Data Structures & Algorithms", proficiency: "Advanced"}, {name: "C++", proficiency: "Advanced"}],
      skillsWanted: [{name: "Machine Learning", proficiency: "Beginner"}],
      isFake: true
    },
    {
      uid: "fake_priya_s",
      displayName: "Priya Sharma",
      email: "priya@university.edu.in",
      phoneNumber: "",
      skillsOffered: [{name: "Machine Learning (TensorFlow)", proficiency: "Advanced"}, {name: "Python Automation", proficiency: "Intermediate"}],
      skillsWanted: [{name: "Frontend Development", proficiency: "Beginner"}],
      isFake: true
    },
    {
      uid: "fake_vikram_singh",
      displayName: "Vikram Singh",
      email: "vsingh@university.edu.in",
      phoneNumber: "",
      skillsOffered: [{name: "Cloud Computing (AWS/Lambda)", proficiency: "Advanced"}],
      skillsWanted: [{name: "Full Stack Web Development", proficiency: "Beginner"}],
      isFake: true
    },
    {
      uid: "fake_kavya_n",
      displayName: "Kavya Nair",
      email: "kavya@university.edu.in",
      phoneNumber: "",
      skillsOffered: [{name: "Digital Marketing & SEO", proficiency: "Advanced"}],
      skillsWanted: [{name: "Basic Python Scripting", proficiency: "Beginner"}],
      isFake: true
    },
    {
      uid: "fake_aditya_p",
      displayName: "Aditya Patil",
      email: "aditya@university.edu.in",
      phoneNumber: "",
      skillsOffered: [{name: "Mobile App Dev (Flutter)", proficiency: "Intermediate"}],
      skillsWanted: [{name: "UI Animation", proficiency: "Beginner"}],
      isFake: true
    },
    {
      uid: "fake_meera_v",
      displayName: "Meera Verma",
      email: "meera@university.edu.in",
      phoneNumber: "",
      skillsOffered: [{name: "Business Communication / Pitching", proficiency: "Advanced"}],
      skillsWanted: [{name: "Data Analytics (SQL)", proficiency: "Intermediate"}],
      isFake: true
    },
    {
      uid: "fake_karthik_r",
      displayName: "Karthik Reddy",
      email: "karthik@university.edu.in",
      phoneNumber: "",
      skillsOffered: [{name: "Cybersecurity & Ethical Hacking", proficiency: "Advanced"}],
      skillsWanted: [{name: "Go Lang", proficiency: "Beginner"}],
      isFake: true
    },
    {
      uid: "fake_sneha_b",
      displayName: "Sneha Banerjee",
      email: "sneha@university.edu.in",
      phoneNumber: "",
      skillsOffered: [{name: "Graphic Design & Illustration", proficiency: "Advanced"}],
      skillsWanted: [{name: "Business Marketing", proficiency: "Intermediate"}],
      isFake: true
    },
    {
      uid: "fake_rahul_t",
      displayName: "Rahul Tiwari",
      email: "rahul@university.edu.in",
      phoneNumber: "",
      skillsOffered: [{name: "Financial Modeling", proficiency: "Intermediate"}],
      skillsWanted: [{name: "Python Automation", proficiency: "Beginner"}],
      isFake: true
    },
    {
      uid: "fake_ananya_m",
      displayName: "Ananya Mukherjee",
      email: "ananya@university.edu.in",
      phoneNumber: "",
      skillsOffered: [{name: "Creative Writing", proficiency: "Advanced"}],
      skillsWanted: [{name: "UI/UX Design", proficiency: "Intermediate"}],
      isFake: true
    }
  ];

  for (let u of fakeUsers) {
    await set(ref(db, `users/${u.uid}`), u);
  }
}
