# Step-Synth

## Overview

When deciding on what data to use, I decided to go with my step count, which has personal daily goals I try to meet every single day. out of all of my health data, this is the thing I probably refer to the most, and thus I wanted to create an interactive data visualization for it. This project is an interactive data portrait built with p5.js. It visualizes daily step counts as a skyline-style bar chart with an optional overlay of weekday trend lines (Mon–Sun). It also includes a playful “remix” mode that sonifies those weekday trends with seven oscillators, turning routine activity into a synth sketch.

The goal was to make something clear and engaging, easy to grasp right away but fun to explore through hovers, toggles, and sound.

## Functionality

This project has 2 main modes:

1. **Bars (Default) — “Per-day view”**

   - Renders one bar per day from steps_daily.csv.

   - Draws an 8,000-step goal line across the chart.

   - Hover any bar to see the exact date and step count in a lightweight tooltip.

   - Monthly grid lines and compact y-axis labels keep the scene uncluttered.

2. **Trends + Audio Remix — “Weekday voices”**

   - Toggle Weekday Trends to show seven colored lines, one for each weekday, smoothed across calendar weeks since the first data point.

   - Play Remix (Trends) activates a 7-oscillator sonification (Sun–Sat). Each voice maps steps to a note in a pentatonic scale; higher activity yields higher pitch and slightly stronger amplitude. Each voice has a different waveform for timbral variety (e.g., Mon=triangle, Tue=saw, Wed=square, …). That’s why Monday doesn’t just play a different pitch; it also has a different “color” of sound. During playback we advance a cursor weekIdx = 0 → 1 → 2 → … at a rate set by the Tempo slider (BPM). On each tick, every weekday voice updates to the value of its trend at that week (with interpolation). Also, weeks where a weekday trend is closer to (or above) your goal are louder; weeks far below goal are quieter (but not fully silent thanks to the floor 0.15 so you can still hear the line).

   - Legend click hides/shows individual weekday lines (audio follows visibility), so if you click off "sunday" you won't hear the sunday 'mix' in the audio.

   - Tempo & Volume sliders let you set the pacing (BPM → weeks per beat) and overall loudness.
     refer to Play-Through-PondSketch.mov for an example usage of both modes.

## Design Principles

The design focuses on clarity, restraint, and small, meaningful interactions:

- Skyline metaphor: Bars are neutral and compact; the red goal line provides a stable visual anchor.

- Minimal annotation: Monthly tick marks and soft grid lines reduce visual noise while preserving orientation.

- Direct manipulation: Hover reveals; toggles and legend clicks control complexity without new screens or dialogs.

- Human-scaled sound: The sonification uses a pentatonic scale across a few octaves to sound musical, not alarming, and ramps smoothly between notes to avoid harsh jumps.

By separating daily detail (bars) from weekly rhythm (trends + audio), the piece balances specific insight (“How many steps on July 14?”) with structural insight (“Do my Tuesdays trend higher?”).

## Development Process

The development process involved several stages, starting with data collection and cleaning. First, I thought of what data I would like to analyze, and settled on the data I refer to most often every day: my step count. I exported my health data from my apple watch and formatted it into a CSV file suitable for visualization. Next, I tried to visualize what sort of data visualization would best represent this information. I I experimented with a couple different chart types (such as anomaly detection and line charts) and settled on a skyline-style bar chart for its clarity and aesthetic appeal. I liked the aesthetic of the "skyline" considering I do most of my walking in the city rather than hiking.

Then, I noticed that while I have health data and step count from before May 2023, it was actually before I had my apple watch and was thus inaccruate, so I trimmed it from the data. Then I proceeded to code the bar data and the daily trends at the same time. I wanted to see daily trends (as in the day of the week) because that is data apple health doesn't actually typically provide you with so I wanted to explore that aspect further. For fun I also wanted to see what would happen if I made a "sound track" for the pattern of each day, and spent the rest of my time after I was finished with my visualization doing that.

## Future Work

There are several areas I wanted to expand the project on, but mostly the sound. Right now it's just odd synth music and not really too fun to listen to. I ideally want to come up with a way to make the music more engaging and pleasant.
