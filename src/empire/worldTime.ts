/** A week spans seven complete day/night cycles, beginning Monday at 08:00. */
export function worldTime(weekProgress:number){
  const progress=Math.max(0,Math.min(99.9999,weekProgress));
  const dayProgress=(progress*7/100)%1;
  const hours=(8+dayProgress*24)%24;
  const daylight=Math.max(0,Math.sin((hours-6)/12*Math.PI));
  const isNight=hours<6||hours>=19;
  const minutes=Math.floor(hours*60);
  return {day:Math.floor(progress*7/100)+1,hours,daylight,isNight,label:`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`,period:isNight?'Night':hours<10?'Morning':hours<17?'Day':'Evening'};
}
