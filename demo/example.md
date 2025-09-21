# Music Notation Demo

This document demonstrates both the LilyPond and SVGuitar integrations in music-md.

## Simple Melody

Here's a basic melody in C major:

```lilypond
\version "2.20.0"

{
  \clef treble
  \time 4/4
  \key c \major

  c'4 d'4 e'4 f'4 |
  g'4 a'4 b'4 c''2
}
```

## Chord Progression

A simple chord progression:

```lilypond
\version "2.20.0"

{
  \clef treble
  \time 4/4
  \key c \major

  <c' e' g'>2 <a c' e'>2 |
  <f a c'>2 <g b d'>2 |
  <c' e' g'>1
}
```

## Bass Line

And here's a corresponding bass line:

```lilypond
\version "2.20.0"

{
  \clef bass
  \time 4/4
  \key c \major

  c2 a,2 |
  f,2 g,2 |
  c1
}
```

## Guitar Chords

Here are some common guitar chord diagrams:

### C Major Chord

```svguitar
{
  "fingers": [
    [1, 3, "3"],
    [2, 1, "1"],
    [3, 0],
    [4, 2, "2"],
    [5, 3, "3"],
    [6, "x"]
  ],
  "title": "C Major",
  "position": 1
}
```

### F Major Barre Chord

```svguitar
{
  "fingers": [
    [1, 1],
    [2, 1],
    [3, 3, "3"],
    [4, 3, "4"],
    [5, 2, "2"],
    [6, 1]
  ],
  "barres": [
    {
      "fromString": 6,
      "toString": 1,
      "fret": 1,
      "text": "1"
    }
  ],
  "title": "F Major",
  "position": 1
}
```

### G Major Chord

```svguitar
{
  "fingers": [
    [1, 3, "3"],
    [5, 2, "2"],
    [6, 3, "4"]
  ],
  "title": "G Major"
}
```

### Complex Chord Example

```svguitar
{
  "fingers": [
    [1, 2, { "text": "2", "color": "#ff6b6b" }],
    [2, 3, { "text": "3", "color": "#4ecdc4" }],
    [3, 4, { "text": "4", "color": "#45b7d1" }],
    [4, 2, { "text": "1", "color": "#96ceb4" }],
    [5, "x"],
    [6, "x"]
  ],
  "title": "Custom Styled Chord"
}
```

## Multiple Chords in One Block

You can also display multiple chord diagrams together by using an array:

### Common Chord Progression (C-Am-F-G)

```svguitar
[
  {
    "fingers": [
      [1, 3, "3"],
      [2, 2, "2"],
      [5, 1, "1"]
    ],
    "title": "C Major"
  },
  {
    "fingers": [
      [2, 2, "2"],
      [3, 2, "3"],
      [4, 2, "4"]
    ],
    "title": "A Minor"
  },
  {
    "fingers": [
      [1, 1],
      [2, 1],
      [3, 3, "3"],
      [4, 3, "4"],
      [5, 2, "2"],
      [6, 1]
    ],
    "barres": [
      {
        "fromString": 6,
        "toString": 1,
        "fret": 1,
        "text": "1"
      }
    ],
    "title": "F Major",
    "position": 1
  },
  {
    "fingers": [
      [1, 3, "3"],
      [5, 2, "2"],
      [6, 3, "4"]
    ],
    "title": "G Major"
  }
]
```

### Power Chord Sequence

```svguitar
[
  {
    "fingers": [
      [5, 3, "1"],
      [6, 3, "1"]
    ],
    "title": "A5"
  },
  {
    "fingers": [
      [4, 3, "1"],
      [5, 3, "1"]
    ],
    "title": "D5"
  }
]
```

This markdown file can be processed by both the remark-lilypond and remark-svguitar plugins to generate HTML with embedded SVG musical notation and guitar chord diagrams.
