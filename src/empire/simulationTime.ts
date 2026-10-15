// Calendar clocks retain the save format: 180 normalized seconds = seven days.
// Activity seconds run at the player's 1× / 2× / 5× speed, independent of week length.
export const CALENDAR_WEEK_SECONDS=180;
export const venueActivityTime=(venue:{clock:number;activityClock?:number})=>venue.activityClock??venue.clock;
export function venueStep(clock:number,delta:number,calendarRate=1){
 if(!Number.isFinite(delta)||delta<=0||!Number.isFinite(calendarRate)||calendarRate<=0)return {activity:0,calendar:0};
 const calendar=Math.min(delta*calendarRate,Math.max(0,CALENDAR_WEEK_SECONDS-clock));
 return {activity:calendar/calendarRate,calendar};
}
