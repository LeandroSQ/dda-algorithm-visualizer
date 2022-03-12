const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Max distance to search for a intersection
const maxDistance = 20;

// Grid
const grid = [];
const gridCount = 10;
let gridCellWidth = 0;
let gridCellHeight = 0;

// Mouse
const LEFT_CLICK = 0;
const RIGHT_CLICK = 2;
let mouseAction = null;
let mousePos = { x: 0, y: 0 };

// Player and target
let playerRadius = 0;
let playerPos = { x: 0, y: 0 };
let targetPos = { x: 0, y: 0 };

//#region Utility
function getCellColor(cell) {
	switch (cell) {
		case 0:
			return "#212121";
		case 1:
			return "#f44336";
	}
}

function normalize(vector) {
	const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
	return { x: vector.x / length, y: vector.y / length };
}

function distance(a, b) {
	return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function setGrid(x, y, value) {
	if (x < 0 || x >= gridCount || y < 0 || y >= gridCount) return;

	grid[y][x] = value;
}

function getGrid(x, y) {
	if (x < 0 || x >= gridCount || y < 0 || y >= gridCount) return 0;

	return grid[y][x];
}

function drawPoint(position, color, size = 1) {
	const radius = (playerRadius / 4) * size;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(
		position.x * gridCellWidth,
		position.y * gridCellHeight,
		radius,
		0,
		2 * Math.PI
	);
	ctx.fill();
}

//#endregion

//#region Event listeners
function onMouseMove(e) {
	const x = Math.floor(e.clientX / gridCellWidth);
	const y = Math.floor(e.clientY / gridCellHeight);
	mousePos = { x, y };

	if (mouseAction === "add") {
		setGrid(x, y, 1);
	} else if (mouseAction === "remove") {
		setGrid(x, y, 0);
	} else if (mouseAction === "movePlayer") {
		playerPos = { x: e.clientX / gridCellWidth, y: e.clientY / gridCellHeight };
	} else if (mouseAction === "moveTarget") {
		targetPos = { x: e.clientX / gridCellWidth, y: e.clientY / gridCellHeight };
	}
}

function onMouseDown(e) {
	const x = e.clientX / gridCellWidth;
	const y = e.clientY / gridCellHeight;
	mousePos = { x: Math.floor(x), y: Math.floor(y) };

	if (e.button === LEFT_CLICK) {
		// Calculate the distance between the player and the target
		const playerDistance = distance({ x, y }, playerPos);
		const targetDistance = distance({ x, y }, targetPos);
		const radius = playerRadius / gridCellWidth;

		if (playerDistance <= radius && playerDistance < targetDistance) {
			// If the player is within the radius of the target, start dragging the player
			mouseAction = "movePlayer";
		} else if (
			targetDistance <= radius &&
			targetDistance < playerDistance
		) {
			// If the target is within the radius of the player, start dragging the target
			mouseAction = "moveTarget";
		} else {
			// Otherwise, just add walls
			mouseAction = "add";
			setGrid(mousePos.x, mousePos.y, 1);
		}
	} else if (e.button === RIGHT_CLICK) {
		// Remove walls
		mouseAction = "remove";
		setGrid(mousePos.x, mousePos.y, 0);
	}
}

function onMouseUp(e) {
	mouseAction = null;
}

function onResize(e) {
	canvas.width = document.body.clientWidth;
	canvas.height = document.body.clientHeight;
	gridCellWidth = canvas.width / gridCount;
	gridCellHeight = canvas.height / gridCount;
	playerRadius = gridCellWidth / 6;
}
//#endregion

function castRay() {
	const from = { x: playerPos.x, y: playerPos.y };
	const to = { x: targetPos.x, y: targetPos.y };

	const diff = { x: to.x - from.x, y: to.y - from.y };
	const direction = normalize(diff);
	const unitStepSize = {
		x: Math.abs(1.0 / direction.x),
		y: Math.abs(1.0 / direction.y),
	};

	// Current coordinates, integer
	let current = { x: Math.floor(from.x), y: Math.floor(from.y) };
	let length = { x: 0, y: 0 };
	let step = { x: 0, y: 0 };

	// Determine step direction
	if (direction.x < 0) {
		step.x = -1;
		length.x = (from.x - current.x) * unitStepSize.x;
	} else {
		step.x = 1;
		length.x = (current.x + 1.0 - from.x) * unitStepSize.x;
	}
	if (direction.y < 0) {
		step.y = -1;
		length.y = (from.y - current.y) * unitStepSize.y;
	} else {
		step.y = 1;
		length.y = (current.y + 1.0 - from.y) * unitStepSize.y;
	}

	let points = [];

	// Increment current until we hit a wall
	const maxDistance = 100;
	let distance = 0;
	let found = false;
	let isHorizontal = false;
	while (!found && distance < maxDistance) {
		// Walk the shortest path
		if (length.x < length.y) {
			current.x += step.x;
			distance = length.x;
			length.x += unitStepSize.x;
			isHorizontal = false;

			// Draws a horizontal point
			drawPoint(current, "#00FF004B");
			points.push({ x: current.x, y: current.y });
		} else {
			current.y += step.y;
			distance = length.y;
			length.y += unitStepSize.y;
			isHorizontal = true;

			// Draws a vertical point
			drawPoint(current, "#0000ff4B");
			points.push({ x: current.x, y: current.y });
		}

		// Test tile collision at new position
		if (getGrid(current.x, current.y) === 1) {
			drawPoint(current, "#ff00ff4B");
			found = true;
		}
	}

	// Draw a dashed between points
	ctx.beginPath();
	ctx.strokeStyle = "pink";
	ctx.setLineDash([15, 15]);
	ctx.moveTo(playerPos.x * gridCellWidth, playerPos.y * gridCellHeight);
	points.forEach(point => {
		ctx.lineTo(point.x * gridCellWidth, point.y * gridCellHeight);
	});
	ctx.stroke();
	ctx.closePath();

	// Calculate the intersection point
	if (found) {
		return {
			x: from.x + direction.x * distance,
			y: from.y + direction.y * distance,
			isHorizontal
		};
	}

	return null;
}

function setup() {
	// Hook events
	canvas.oncontextmenu = function() { return false; };// Disable right click menu
	window.addEventListener("mousemove", onMouseMove);
	window.addEventListener("mousedown", onMouseDown);
	window.addEventListener("mouseup", onMouseUp);
	window.addEventListener("resize", onResize);

	// Setup grid
	for (let y = 0; y < gridCount; y++) {
		const buffer = [];
		for (let x = 0; x < gridCount; x++) buffer.push(0);
		grid.push(buffer);
	}

	// Setup player
	playerPos = { x: 1, y: 1 };

	// Setup target
	targetPos = { x: gridCount - 1, y: gridCount - 1 };

	// Setup canvas
	onResize();
}

function loop() {
	// Clears canvas
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Draws grid
	ctx.strokeStyle = `rgba(255, 255, 255, 0.05)`;
	ctx.setLineDash([]);
	for (let x = 0; x < gridCount; x++) {
		for (let y = 0; y < gridCount; y++) {
			const cell = grid[y][x];

			ctx.beginPath();
			ctx.fillStyle = getCellColor(cell);
			ctx.rect(x * gridCellWidth, y * gridCellHeight, gridCellWidth, gridCellHeight);
			ctx.fill();
			ctx.stroke();
			ctx.closePath();
		}
	}

	const intersection = castRay();

	// Draw a dashed line from the player to the target
	ctx.beginPath();
	ctx.strokeStyle = "#FFFFFF";
	ctx.setLineDash([5, 5]);
	ctx.moveTo(playerPos.x * gridCellWidth, playerPos.y * gridCellHeight);
	ctx.lineTo(targetPos.x * gridCellWidth, targetPos.y * gridCellHeight);
	ctx.stroke();
	ctx.closePath();

	// Draws the player
	ctx.beginPath();
	ctx.fillStyle = "#36F49B";
	ctx.arc(playerPos.x * gridCellWidth, playerPos.y * gridCellHeight, playerRadius, 0, 2 * Math.PI);
	ctx.fill();
	ctx.closePath();

	// Draws the target
	ctx.beginPath();
	ctx.fillStyle = "#3698F4";
	ctx.arc(targetPos.x * gridCellWidth, targetPos.y * gridCellHeight, playerRadius, 0, 2 * Math.PI);
	ctx.fill();
	ctx.closePath();

	if (intersection) {
		const size = playerRadius / 2;

		ctx.beginPath();
		ctx.fillStyle = intersection.isHorizontal ? "#ffff00" : "#FFAE00";

		if (intersection.isHorizontal) {
			ctx.fillRect(
				intersection.x * gridCellWidth - size,
				intersection.y * gridCellHeight - size,
				size * 2,
				size
			);
		} else {
			ctx.fillRect(
				intersection.x * gridCellWidth - size,
				intersection.y * gridCellHeight - size,
				size,
				size * 2
			);
		}

		// drawPoint(intersection, color, 2);
	}

	requestAnimationFrame(loop.bind(this));
}

setup();
loop();
