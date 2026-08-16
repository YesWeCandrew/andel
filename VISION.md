# Vision

This document describes the vision for this application.

Andel is a home planning and assistant app. Eventually it should contain all the information we need to organise and run a household day to day and week to week:
- Chores
- Shopping
- Meal planning
- More

## Shopping List
The shopping list is an intelligent list of products. Each item should be made of a product, quantity and a unit. It should be as easy as possible to enter a product, with the item being the only one required. In this case, quantity is defaulted to 1, and unit is blank, which indicates it is a piece.

Eventually, each item in the shopping list will show the recipe it was added from. This will only happen after the recipes functionality is added.

When the same item is added multiple times, the shopping list should update the quantity and combine them. To assist with this, products that have been entered are kept in a seperate table. This enables autocomplete and increases the chance that products will match when entered. Products can be deleted from this table easily by clicking an X - this prevents typos from continually causing issues. Similarly, the unit section will be a drop down that allows people to add new units as well.

We also keep track of the unit and quantities used for each product. This will autocomplete the quantity and unit to speed up entry further.

In the future I might add common conversions between units, but for now that won't be included.

### Defaults
To help users the following defaults units should already exist:
- gram
- ml
- tsp
- tbsp
- cup

## Design 

### Feel
The app should have a single dashboard homepage which contains all the components of the app. Users can interact directly with the components in the homepage, or click on them to expand them to full screen.

The code written should be reactive to any reasonably sized screen, including mobile. For example, the one component for the todo app should work whether it is full screen on a tablet, or a component on the homepage, or on mobile. 

The one exception is the dashboard which will need to appear differently on mobile - likely by being scrollable instead.

The UI should be clean and prefer minimal taps or clicks to drop down menus. 

### Colours

Key colours are:
- Accent: rgb(80, 120, 100)
- Secondary: rgb(140, 180, 150)
- Background: rgb(231, 234, 228)
- Foreground: rgb(246, 247, 243)

### Objects
Objects should have rounded edges and slight box shadows.


### Fonts
All fonts should be DM sans.

### Icons
Icons should come from iconoir wherever possible. Each aspect of the app has a dedicated icon:
- To Do: CheckCircle
- Shopping List: Cart
- Recipes: PizzaSlice
- Meal Plan: Calendar
- 