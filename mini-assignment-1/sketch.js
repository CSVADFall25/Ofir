function setup() {
  createCanvas(600, 600);
  background(220);

  //Face
  fill(180); 
  noStroke();
  ellipse(300, 350, 300, 300);


  fill(180);
  triangle(180, 260, 150, 140, 280, 260); // left ear, tip far left
  triangle(420, 260, 450, 140, 320, 260); // right ear, tip far right
  fill(255, 182, 193);
  triangle(200, 248, 165, 160, 240, 245);
  triangle(400, 248, 435, 160, 365, 245);


  //Eyes
  fill(255);
  ellipse(250, 340, 60, 80);
  ellipse(350, 340, 60, 80);

  fill(0);
  ellipse(250, 340, 20, 40);
  ellipse(350, 340, 20, 40);

  //Nose
  fill(255, 182, 193);
  triangle(290, 390, 310, 390, 300, 405);

  //Mouth
  stroke(0);
  strokeWeight(3);
  line(300, 405, 300, 420);
  line(300, 420, 285, 430);
  line(300, 420, 315, 430);

  //Whiskers
  line(180, 380, 260, 390);
  line(180, 400, 260, 400);
  line(180, 420, 260, 410);

  line(420, 380, 340, 390);
  line(420, 400, 340, 400);
  line(420, 420, 340, 410);
}
