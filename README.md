<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/09bf4f26-9be8-4123-a013-9c1f14f26cf0

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Neighborhood businesses

Open the game at `http://127.0.0.1:4189/`. The neighborhood is the game world: choose **Neighborhood** to zoom out, then click a building or its label to manage it. The game controls stay on screen; owned buildings open as interiors in the same world.

- Acquire properties between weeks using a loan from an existing business. The price includes opening equipment and supplies, plus $300 of cash in the new business account.
- The café and second restaurant have independent playable kitchens, menus, ingredients, staff, tables, and upgrades. Click the building, then **Run this restaurant** to work on its floor. Every property has operations, offers/prices, staff, inventory, upgrades, financial reports, and loans in the restaurant-style management console.
- The hotel, apartments, shop, and park run live service: visitors arrive and pay as they are served. Choose individual offers and prices, hire staff, select shop products, order supplies, and maintain the property. Management sections open separately; the bottom menu is the single navigation bar.
- New hotels open with ground-floor reception and four standard rooms on one guest floor. Apartments start with reception and three studios on one residential floor. Open additional floors between weeks after serving enough occupants and paying from that building's account: up to five hotel guest floors (20 rooms) or ten residential floors (30 homes). Existing saves retain all rooms, occupants and agreed prices.
- **Rooms & Rates / Homes & Rents** controls each unit's type, price, condition, cleaning and renovations. **Bookings / Applications & Leases** tracks reservations, walk-ins, overnight stays, reviews and six-week leases. Booked rates stay fixed; apartments collect the agreed weekly rent once per week. Rooms are unavailable after checkout until cleaned.
- Mornings bring housekeeping and checkouts, afternoons bring arrivals, and evenings bring service requests, noise complaints or repair faults. Help, offer a 25% refund, or relocate the occupant to a ready unit. Reception, housekeeping and maintenance staff have individual role shifts and finite service capacity. Inventory includes six hotel supplies, and purchasing managers follow per-item minimums, weekly budgets and cash reserves.
- Paid facilities unlock with additional floors: breakfast restaurant (hotel), gym, conference lounge and rooftop lounge. The amenities floor becomes selectable in 3D. Weekly reports show occupancy, average agreed rate, income and reputation; financials retain P&L, balance sheet, cash flow, wages owed and business loans.
- All businesses share a calendar, but their cash is separate. **Finance** records loans and repayments; borrowing is not sales income. Rent is paid once at week end, and wages are paid after the first three days of the following week.
- Kitchens keep running while you visit another property. Use the global pause control while planning; a restaurant without a waiter still needs you to take and serve orders.
- Progress saves automatically in this browser on this device every two seconds and on page exit. There is no offline income. The separate `expansion.html` prototype still uses sample money and does not change the main save. The detailed `property-preview.html` prototype demonstrates all seven properties, native restaurant recipe/ingredient screens, and matching three-statement financial reports. Its sample accounts reset on reload.
- **Testing · unlock all** opens all seven properties between weeks and tops each separate account up to $25,000. Recipes and staff milestones become available without changing sales history, existing staff, inventories, or loans. **Testing · top up funds** can replenish funds again; balances above $25,000 stay intact. Test grants are capital, not trading income, and persist in the save.

Validation: `npm test`, `npm run lint`, and `npm run build`.
