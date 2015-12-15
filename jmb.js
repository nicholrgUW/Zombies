/*
 * name: Julia Behnen, Robbie Nichols, Jeffrey LeCompte
 * assignment: Assignment 3 - Zombie Slayer Agents
 * class: TCSS 435 AI - Dr. Chriss Marriot
 */



// find and replace JMB with your initials (i.e. ABC)
// change this.name = "Your Chosen Name"

// only change code in selectAction function()

function JMB(game) {
    this.player = 1;
    this.radius = 10;
    this.rocks = 0;
    this.kills = 0;
    this.name = "Rikki Nixon";
    this.color = "Green";
    this.cooldown = 0;
    Entity.call(this, game, this.radius + Math.random() * (800 - this.radius * 2), this.radius + Math.random() * (800 - this.radius * 2));

    this.velocity = { x: 0, y: 0 };
}

JMB.prototype = new Entity();
JMB.prototype.constructor = JMB;

// alter the code in this function to create your agent
// you may check the state but do not change the state of these variables:
//    this.rocks
//    this.cooldown
//    this.x
//    this.y
//    this.velocity
//    this.game and any of its properties

// you may access a list of zombies from this.game.zombies
// you may access a list of rocks from this.game.rocks
// you may access a list of players from this.game.players

JMB.prototype.selectAction = function () {

    // TODO check if zombies are moving toward or away
    // TODO penalize getting closer to walls/corners: increasing penalty
    // TODO don't run away from zombies that are going to die this turn
    // TODO plot to intercept a STATIONARY rock

    /*
     todo    avoid clumping with other survivors
     todo    avoid throwing only rock unless necessary or to save a nearby survivor (protecting others to protect self)
     todo    avoid throwing at far zombies or zombies that already have rock thrown at them
     */

    var action = { direction: { x: 0, y: 0 }, throwRock: false, target: null};
    var acceleration = 1000000;
    var closest = 1000;
    var target = null;
    this.visualRadius = 300;

    // moving away from zombies
    for (var i = 0; i < this.game.zombies.length; i++) {
        var ent = this.game.zombies[i];
        var dist = distance(ent, this);

        // Note: tested throwing rocks at zombies that will arrive first. Less accurate,
        // lower rock retrieval.
        //var time = dist/ent.maxSpeed;
        if (dist < closest) {
            closest = dist;
            target = ent;
        }
        // Only checking against zombies within visual radius
        // (not running from really far away zombies)
        if (this.collide({x: ent.x, y: ent.y, radius: this.visualRadius})) {
            // Treat the player as the origin (0, 0)
            var difX = (ent.x - this.x) / dist;
            var difY = (ent.y - this.y) / dist;
            action.direction.x -= 2 * difX * acceleration / (dist * dist);
            action.direction.y -= 2 * difY * acceleration / (dist * dist);
        }
    }

    // moving away from other players
    for (var i = 0; i < this.game.players.length; i++) {
        var ent = this.game.players[i];
        var dist = distance(ent, this);
        // avoid comparing to self (and the associated divided-by-zero errors)
        if (dist != 0) {
            // Only checking against players within visual radius
            if (this.collide({x: ent.x, y: ent.y, radius: this.visualRadius})) {
                // Treat the player as the origin (0, 0)
                var difX = (ent.x - this.x) / dist;
                var difY = (ent.y - this.y) / dist;
                action.direction.x -= 0.25 * difX * acceleration / (dist * dist);
                action.direction.y -= 0.25 * difY * acceleration / (dist * dist);
            }
        }
    }

    var closestRockDist = 1000;
    var closestRock = null;
    // moving toward rocks
    for (var i = 0; i < this.game.rocks.length; i++) {
        var ent = this.game.rocks[i];
        // Chase a rock if not about to disappear, is not being thrown, if I have less than 2, if I can see it
        if (!ent.removeFromWorld && /**!ent.thrown && */ this.rocks < 2 && this.collide({ x: ent.x, y: ent.y, radius: this.visualRadius })) {
            var dist = distance(this, ent);
            if (dist < closestRockDist) {
                closestRockDist = dist;
                closestRock = ent;
            }
            if (dist > this.radius + ent.radius) {
                var difX = (ent.x - this.x) / dist;
                var difY = (ent.y - this.y) / dist;
                action.direction.x += difX * acceleration / (dist * dist);
                action.direction.y += difY * acceleration / (dist * dist);
            }
        }
    }

    if (target) {
        action.target = this.mrSuluPlotAnInterceptCourse(target, target.velocity, this, new Rock().maxSpeed);
        dist = distance (this, target);

        // this is new, holds last rock until zomb is very close
        // added second part where player will only throw (1 of 2 rocks) when the
        // zombie is within certain range (more likely to hit it).
        if (action.target != null && this.rocks === 2 && (dist < 200 || this.kills < 1)) {
            action.throwRock = true;
        }

        if (action.target != null && this.rocks === 1 && (dist < 100 || this.kills < 1)) {
            action.throwRock = true;
        }
    }



    // If a rock is closer than any zombie, EMPHASIZE GRABBING THE ROCK
    if (closestRockDist < closest) {
        var difX = (closestRock.x - this.x) / dist;
        var difY = (closestRock.y - this.y) / dist;
        action.direction.x += 2 * difX * acceleration / (dist * dist);
        action.direction.y += 2 * difY * acceleration / (dist * dist);
    } else {
        // moving away from edges and corners
        var cornerAllergy = this.cornerAllergy(acceleration);
        var centerDist = cornerAllergy.dist;
        var cornerX = cornerAllergy.x;
        var cornerY = cornerAllergy.y;
        var correctionX = 0;
        var correctionY = 0;
        if (centerDist > 500) {
            // Exit at a slight angle to reduce chance of getting trapped
            correctionX = this.cornerCorrection(centerDist, cornerX, acceleration, 100);
            correctionY = this.cornerCorrection(centerDist, cornerY, acceleration, 105);
        } else if (centerDist > 300) {
            // Exit at a slight angle to reduce chance of getting trapped
            correctionX = this.cornerCorrection(centerDist, cornerX, acceleration, 200);
            correctionY = this.cornerCorrection(centerDist, cornerY, acceleration, 205);
        }
        action.direction.x -= correctionX;
        action.direction.y -= correctionY;
    }

    return action;
};

// Adapted to Javascript from http://jaran.de/goodbits/2011/07/17/calculating-an-intercept-course-to-a-target-with-constant-direction-and-velocity-in-a-2-dimensional-plane/
/**
 * Calculates the point of interception for one object starting at point
 * <code>a</code> with speed vector <code>v</code> and another object
 * starting at point <code>b</code> with a speed of <code>s</code>.
 *
 * @see <a
 *      href="http://jaran.de/goodbits/2011/07/17/calculating-an-intercept-course-to-a-target-with-constant-direction-and-velocity-in-a-2-dimensional-plane/">Calculating
 *      an intercept course to a target with constant direction and velocity
 *      (in a 2-dimensional plane)</a>
 *
 * @param a
 *            start vector of the object to be intercepted
 * @param v
 *            speed vector of the object to be intercepted
 * @param b
 *            start vector of the intercepting object
 * @param s
 *            speed of the intercepting object
 * @return vector of interception or <code>null</code> if object cannot be
 *         intercepted or calculation fails
 *
 * @author Jens Seiler, adapted to Javascript and renamed by Julia Behnen
 */
JMB.prototype.mrSuluPlotAnInterceptCourse = function(a, v, b, s) {
    var ox = a.x - b.x;
    var oy = a.y - b.y;

    var h1 = v.x * v.x + v.y * v.y - s * s;
    var h2 = ox * v.x + oy * v.y;
    var t;
    if (h1 == 0) { // problem collapses into a simple linear equation
        t = -(ox * ox + oy * oy) / 2*h2;
    } else { // solve the quadratic equation
        var minusPHalf = -h2 / h1;

        var discriminant = minusPHalf * minusPHalf - (ox * ox + oy * oy) / h1; // term in brackets is h3
        if (discriminant < 0) { // no (real) solution then...
            return null;
        }

        var root = Math.sqrt(discriminant);

        var t1 = minusPHalf + root;
        var t2 = minusPHalf - root;

        var tMin = Math.min(t1, t2);
        var tMax = Math.max(t1, t2);

        t = tMin > 0 ? tMin : tMax; // get the smaller of the two times, unless it's negative
        if (t < 0) { // we don't want a solution in the past
            return null;
        }
    }

    // calculate the point of interception using the found intercept time and return it
    var targetX = a.x + t * v.x;
    var targetY = a.y + t * v.y;
    return { x: targetX, y: targetY };
};

JMB.prototype.cornerAllergy = function(acceleration) {
    var center = {x: 400, y: 400};
    var dist = distance(this, center);
    var difX = (this.x - center.x) / dist;
    var difY = (this.y - center.y) / dist;
    //correctionX = (Math.exp(dist/100) - 1.5) * difX * acceleration / (dist * dist);
    //correctionY = (Math.exp(dist/100) - 1.5) * difY * acceleration / (dist * dist);
    return {x: difX, y: difY, dist: dist};
};

JMB.prototype.cornerCorrection = function(dist, diff, acceleration, divisor) {
    return (Math.exp(dist/divisor) - 1) * diff * acceleration / (dist * dist);
};

// do not change code beyond this point

JMB.prototype.collide = function (other) {
    return distance(this, other) < this.radius + other.radius;
};

JMB.prototype.collideLeft = function () {
    return (this.x - this.radius) < 0;
};

JMB.prototype.collideRight = function () {
    return (this.x + this.radius) > 800;
};

JMB.prototype.collideTop = function () {
    return (this.y - this.radius) < 0;
};

JMB.prototype.collideBottom = function () {
    return (this.y + this.radius) > 800;
};

JMB.prototype.update = function () {
    Entity.prototype.update.call(this);
    // console.log(this.velocity);
    if (this.cooldown > 0) this.cooldown -= this.game.clockTick;
    if (this.cooldown < 0) this.cooldown = 0;
    this.action = this.selectAction();
    //if (this.cooldown > 0) console.log(this.action);
    this.velocity.x += this.action.direction.x;
    this.velocity.y += this.action.direction.y;

    var speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    if (speed > maxSpeed) {
        var ratio = maxSpeed / speed;
        this.velocity.x *= ratio;
        this.velocity.y *= ratio;
    }

    this.x += this.velocity.x * this.game.clockTick;
    this.y += this.velocity.y * this.game.clockTick;

    if (this.collideLeft() || this.collideRight()) {
        this.velocity.x = -this.velocity.x * friction;
        if (this.collideLeft()) this.x = this.radius;
        if (this.collideRight()) this.x = 800 - this.radius;
        this.x += this.velocity.x * this.game.clockTick;
        this.y += this.velocity.y * this.game.clockTick;
    }

    if (this.collideTop() || this.collideBottom()) {
        this.velocity.y = -this.velocity.y * friction;
        if (this.collideTop()) this.y = this.radius;
        if (this.collideBottom()) this.y = 800 - this.radius;
        this.x += this.velocity.x * this.game.clockTick;
        this.y += this.velocity.y * this.game.clockTick;
    }

    for (var i = 0; i < this.game.entities.length; i++) {
        var ent = this.game.entities[i];
        if (ent !== this && this.collide(ent)) {
            if (ent.name !== "Zombie" && ent.name !== "Rock") {
                var temp = { x: this.velocity.x, y: this.velocity.y };
                var dist = distance(this, ent);
                var delta = this.radius + ent.radius - dist;
                var difX = (this.x - ent.x) / dist;
                var difY = (this.y - ent.y) / dist;

                this.x += difX * delta / 2;
                this.y += difY * delta / 2;
                ent.x -= difX * delta / 2;
                ent.y -= difY * delta / 2;

                this.velocity.x = ent.velocity.x * friction;
                this.velocity.y = ent.velocity.y * friction;
                ent.velocity.x = temp.x * friction;
                ent.velocity.y = temp.y * friction;
                this.x += this.velocity.x * this.game.clockTick;
                this.y += this.velocity.y * this.game.clockTick;
                ent.x += ent.velocity.x * this.game.clockTick;
                ent.y += ent.velocity.y * this.game.clockTick;
            }
            if (ent.name === "Rock" && this.rocks < 2) {
                this.rocks++;
                ent.removeFromWorld = true;
            }
        }
    }


    if (this.cooldown === 0 && this.action.throwRock && this.rocks > 0) {
        this.cooldown = 1;
        this.rocks--;
        var target = this.action.target;
        var dir = direction(target, this);

        var rock = new Rock(this.game);
        rock.x = this.x + dir.x * (this.radius + rock.radius + 20);
        rock.y = this.y + dir.y * (this.radius + rock.radius + 20);
        rock.velocity.x = dir.x * rock.maxSpeed;
        rock.velocity.y = dir.y * rock.maxSpeed;
        rock.thrown = true;
        rock.thrower = this;
        this.game.addEntity(rock);
    }

    this.velocity.x -= (1 - friction) * this.game.clockTick * this.velocity.x;
    this.velocity.y -= (1 - friction) * this.game.clockTick * this.velocity.y;
};

JMB.prototype.draw = function (ctx) {
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.closePath();
};