# Weekly restaurant loop

The player starts with $1,200, two tables, a chef and three active dishes. The first goal is to serve six guests and earn access to a waiter. Cleaners unlock at 16 guests, delivery partners at 24, and the purchasing manager at 40. Hiring has an immediate fee; staff numbers are capped.

Each operating week contains 180 simulated seconds of service (three minutes at 1x). Days are seven equal portions of the weekly clock. Arrivals double during the lunch rush from 40% to 70% of the week. Pausing arrivals does not stop time or wage accrual. At closing, existing customers finish or leave before the weekly report appears. The report freezes the simulation. Dismissing it opens planning; the player explicitly starts the next week.

Wages accrue while the week is in service, prorated for midweek hires. At week end they are recognized as an expense and recorded as unpaid payroll, rounded to cents. Cash is deducted after three elapsed game days of the following week (3/7 of its progress). The HUD, weekly report and Financials show this obligation. Payment does not expense the same wages a second time.

Players choose one to six active dishes from their unlocked collection. Unlocking a recipe does not automatically add it to the menu. Menu prices are the actual charged prices; the old automatic price-bonus upgrade is removed. Higher prices reduce traffic and selection weight. Orders consume FIFO ingredients and retain their agreed price even if the menu changes.

The chef handles cooking without repeated Cook clicks. Players can prioritize a table, manually take orders, serve complete tables, and clean. Customers waiting too long for food leave and cancel their tickets, and those ingredients go back into stock. A finished delivery counts as one guest. A VIP party pays a 25% premium on the menu price. Random cooking fires are disabled. Idle staff recover stamina, with explicit breaks still available.

Purchasing managers obey an enabled switch, weekly budget, stock target and cash reserve. They buy only active-menu ingredients, refill below half the target, prioritize depleted stock and stop at the budget or reserve. Manual pantry purchases remain available.

## Verification

`npm test` runs deterministic state-transition and balance tests for staffing, active menus, demand, purchasing limits, walkouts, complete-table serving, priorities, weekly settlement and delayed payroll. An attentive simulated opening week earned the first waiter, served 19 guests with no walkouts and made about $187 operating profit with the fixed test seed. This is a balance baseline, not evidence of player enjoyment.

A browser smoke check covered onboarding, locked hires, menu toggles, price-demand feedback, desktop/mobile layouts, a complete unattended week, the report and next-week planning. Further human playtesting should tune early pacing, hiring costs and the usefulness of priority decisions. The career game saves in this browser. A second tab watches that save and does not play it or overwrite it.
