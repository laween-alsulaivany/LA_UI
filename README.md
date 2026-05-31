<p align="center">
  <img src="./assets/la-ui-logo.svg" alt="LA UI" width="280">
</p>

# LA UI

This repo is my personal CSS style guide for app interfaces.

It is mostly a place where I keep my preferred tokens, components, layout rules, and example pages. I use it as a starting point when I build small websites, dashboards, admin pages, and client UI work.

It is not meant to be a perfect design system or a full UI framework. Some parts are still rough, and some decisions may change as I use it more.

## What is in here

The repo includes:

- CSS tokens for colors, spacing, type, borders, shadows, and layout
- Base styles for normal pages
- App shell styles for sidebar and topbar layouts
- Component styles for buttons, cards, charts, feedback, forms, navigation, tables, and workflow screens
- Utility classes for common layout and text needs
- HTML guide pages that document the system
- Preview pages that show the styles in more realistic app layouts

## How to view it

Clone the repo:

```bash
git clone https://github.com/laween-alsulaivany/My_Style.git
cd My_Style
```

Open this file in your browser:

```text
overview.html
```

There is no build step. It is just HTML, CSS, and a little JavaScript for the guide shell.

## Main files

```text
app.css                         Main CSS entry file
app.js                          Shared behavior for the guide pages
showcase-only-new.css           Extra styles used by showcase pages

static/css/foundation/          Base styles and tokens
static/css/layout/              App shell layout
static/css/components/          Component styles
static/css/utilities/           Utility classes

overview.html                   Main overview page
tokens.html                     Token documentation
preview_1.html                  App preview page
preview_2.html                  Second app preview page
```

## Design notes

These are the rules I try to follow while working on this.

### Use spacing before cards

Not every section needs a card around it. A lot of UI looks cleaner when the spacing, heading, and alignment are doing the work first.

### Keep the colors quiet

Most of the interface should stay neutral. Accent colors are there to guide attention, not to decorate every block on the page.

### Use tokens first

I try to avoid random values in component files. Colors, spacing, radius, shadows, and text sizes should usually come from the token files.

### Make examples look like real app screens

I do not want the guide to become a set of fake marketing blocks. The preview pages are meant to feel closer to dashboards, admin tools, forms, tables, and workflow screens.

### Avoid card spam

Cards are useful, but they get ugly fast when every piece of content becomes a floating box. I try to use them only when the grouping actually helps.

### Keep the copy plain

Labels, helper text, and guide notes should explain what the UI does.

### Let dense screens breathe

Tables, forms, charts, and workflow views need enough space to be usable. Some pages are intentionally wider because narrow layouts make the content worse.

### Keep patterns repeatable

If a button, table, alert, or form field looks one way in one page, it should not randomly change somewhere else. Differences should come from clear modifier classes.

### Document patterns before they spread

If I use the same layout or component more than once, it probably belongs in the guide instead of being copied around as a one-off.

## What this is not

This is not a complete accessibility system.

It is not a replacement for a mature UI library.

It is not a universal design system for every website.

It is not fully tested across every browser, screen size, or device.

It is a working style guide that I expect to keep improving.

## Reusing it

You can reuse parts of this system, but check the assumptions first.

Some choices are personal. The spacing, content width, shell layout, and color balance may not fit every project.

If you copy the whole thing, start with the token files and remove anything you do not need.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
