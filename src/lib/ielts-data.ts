import type { IeltsSkill } from "./types";

export interface IeltsChoiceQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export const IELTS_SKILLS: Array<{
  id: IeltsSkill;
  title: string;
  vietnamese: string;
  time: string;
  format: string;
  color: string;
}> = [
  { id: "listening", title: "Listening", vietnamese: "Nghe hiểu", time: "Khoảng 30 phút", format: "4 phần · 40 câu", color: "sky" },
  { id: "reading", title: "Reading", vietnamese: "Đọc hiểu", time: "60 phút", format: "3 bài đọc · 40 câu", color: "emerald" },
  { id: "writing", title: "Writing", vietnamese: "Viết học thuật", time: "60 phút", format: "Task 1 + Task 2", color: "amber" },
  { id: "speaking", title: "Speaking", vietnamese: "Nói", time: "11–14 phút", format: "3 phần phỏng vấn", color: "violet" },
];

export const LISTENING_PRACTICE = {
  id: "campus-library-orientation",
  title: "Campus library orientation",
  part: "Part 2 · Độc thoại tình huống xã hội",
  transcript: `Welcome to the Northbridge University Library. The library opens at eight thirty from Monday to Friday and closes at ten in the evening. At weekends, we open at ten and close at six. New students can collect their library card from the help desk on the ground floor. Please bring your student identification and allow about five minutes for registration. The silent study room is on the second floor, next to the history collection. Group rooms are on the third floor and must be booked online at least one day in advance. Laptops can be borrowed for up to four hours, but chargers must remain inside the library. Finally, our research workshop takes place every Wednesday at two fifteen in Room 204.`,
  questions: [
    { id: "l1", prompt: "What time does the library open on weekdays?", options: ["8:00", "8:30", "9:00", "10:00"], answer: 1, explanation: "The speaker says the library opens at eight thirty from Monday to Friday." },
    { id: "l2", prompt: "Where can students collect a library card?", options: ["Room 204", "The help desk", "The history collection", "The third floor"], answer: 1, explanation: "Library cards are collected from the help desk on the ground floor." },
    { id: "l3", prompt: "Where is the silent study room?", options: ["Ground floor", "First floor", "Second floor", "Third floor"], answer: 2, explanation: "The silent study room is on the second floor." },
    { id: "l4", prompt: "How early must a group room be booked?", options: ["Four hours", "One day", "Two days", "One week"], answer: 1, explanation: "Group rooms must be booked online at least one day in advance." },
    { id: "l5", prompt: "When is the research workshop?", options: ["Tuesday at 2:15", "Wednesday at 2:15", "Wednesday at 2:45", "Friday at 2:15"], answer: 1, explanation: "The workshop is every Wednesday at two fifteen." },
  ] satisfies IeltsChoiceQuestion[],
};

export const READING_PRACTICE = {
  id: "cool-roofs-cities",
  title: "How cool roofs are changing cities",
  passage: [
    "Cities are often warmer than their surrounding countryside. Roads, concrete walls and dark roofs absorb solar energy during the day and release it slowly after sunset. This urban heat-island effect can make summer nights uncomfortable and increase the amount of electricity used for air conditioning.",
    "One response is the cool roof: a roof finished with a light-coloured or specially reflective surface. Instead of absorbing most incoming sunlight, it sends a larger proportion back into the atmosphere. The building below therefore needs less energy for cooling. The idea is simple, but its performance depends on climate, roof design and how well the surface is maintained.",
    "Several city trials have reported lower indoor temperatures in buildings without air conditioning. Cool roofs can be particularly valuable for schools, clinics and low-income housing, where occupants may be vulnerable during heatwaves. At neighbourhood scale, widespread adoption may also reduce outdoor temperatures slightly, although researchers caution that local wind patterns and building density affect the result.",
    "The technology is not equally suitable everywhere. In cold regions, a roof that reflects winter sunlight can increase heating demand. Dirt and biological growth may also reduce reflectivity over time, so periodic cleaning or recoating is needed. For this reason, planners increasingly combine cool roofs with insulation, shade trees and green roofs rather than treating any single measure as a complete solution.",
  ],
  questions: [
    { id: "r1", prompt: "What causes the urban heat-island effect according to paragraph 1?", options: ["A lack of wind", "Surfaces storing and releasing solar energy", "Heat from public transport", "Warm air from the countryside"], answer: 1, explanation: "Paragraph 1 explains that roads, walls and dark roofs absorb and later release solar energy." },
    { id: "r2", prompt: "A cool roof mainly works by...", options: ["creating more shade", "storing heat until winter", "reflecting more sunlight", "collecting rainwater"], answer: 2, explanation: "The reflective surface sends a larger proportion of sunlight back into the atmosphere." },
    { id: "r3", prompt: "Which buildings may benefit especially during heatwaves?", options: ["Factories and airports", "Schools, clinics and low-income housing", "Shopping centres only", "Underground stations"], answer: 1, explanation: "Those three building types are named in paragraph 3." },
    { id: "r4", prompt: "Researchers say neighbourhood results are affected by...", options: ["roof colour alone", "the price of electricity", "wind and building density", "the age of residents"], answer: 2, explanation: "Local wind patterns and building density influence the neighbourhood-scale result." },
    { id: "r5", prompt: "Why can cool roofs be less suitable in cold regions?", options: ["They are damaged by snow immediately", "They can increase winter heating needs", "They block all indoor light", "They cannot be cleaned"], answer: 1, explanation: "Reflecting winter sunlight can increase heating demand." },
  ] satisfies IeltsChoiceQuestion[],
};

export const WRITING_TASKS = [
  {
    id: "academic-task-1-transport",
    label: "Academic Task 1",
    time: 20,
    minimumWords: 150,
    prompt: "The table shows the percentage of commuters using four forms of transport in a city in 2005 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    data: [
      ["Transport", "2005", "2025"],
      ["Private car", "52%", "35%"],
      ["Bus", "24%", "28%"],
      ["Rail", "14%", "25%"],
      ["Bicycle", "10%", "12%"],
    ],
  },
  {
    id: "academic-task-2-remote-study",
    label: "Academic Task 2",
    time: 40,
    minimumWords: 250,
    prompt: "Some people believe that online learning can replace classroom teaching at universities. To what extent do you agree or disagree? Give reasons for your answer and include relevant examples from your knowledge or experience.",
    data: null,
  },
];

export const SPEAKING_PRACTICE = {
  id: "community-and-public-spaces",
  title: "Community and public spaces",
  parts: [
    { id: "part-1", label: "Part 1 · Introduction", preparationSeconds: 0, speakingSeconds: 240, prompts: ["What do you like about the area where you live?", "How often do you use public parks?", "Do you prefer quiet or busy places?", "What would you change about your neighbourhood?"] },
    { id: "part-2", label: "Part 2 · Long turn", preparationSeconds: 60, speakingSeconds: 120, prompts: ["Describe a public place that you enjoy visiting.", "You should say where it is, what it looks like, what people do there, and explain why you enjoy visiting it."] },
    { id: "part-3", label: "Part 3 · Discussion", preparationSeconds: 0, speakingSeconds: 240, prompts: ["Why are public spaces important in large cities?", "Should governments spend more on parks or public transport?", "How might public spaces change in the future?"] },
  ],
};
