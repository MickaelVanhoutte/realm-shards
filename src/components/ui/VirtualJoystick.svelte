<script>
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    // Floating joystick - appears where user touches
    export let visible = false;
    export let posX = 0;
    export let posY = 0;

    let isDragging = false;
    let knobX = 0;
    let knobY = 0;
    let lastDirection = null;
    let moveInterval = null;
    let startX = 0;
    let startY = 0;

    const DEAD_ZONE = 15;
    const MAX_DISTANCE = 40;
    const MOVE_RATE = 150; // ms between moves when holding

    function getDirection(x, y) {
        const distance = Math.sqrt(x * x + y * y);
        if (distance < DEAD_ZONE) return null;

        const angle = Math.atan2(y, x) * (180 / Math.PI);

        if (angle >= -45 && angle < 45) return "right";
        if (angle >= 45 && angle < 135) return "down";
        if (angle >= -135 && angle < -45) return "up";
        return "left";
    }

    export function handleStart(clientX, clientY) {
        isDragging = true;
        startX = clientX;
        startY = clientY;
        knobX = 0;
        knobY = 0;
        lastDirection = null;
    }

    export function handleMove(clientX, clientY) {
        if (!isDragging) return;

        let deltaX = clientX - startX;
        let deltaY = clientY - startY;

        // Clamp to max distance
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > MAX_DISTANCE) {
            deltaX = (deltaX / distance) * MAX_DISTANCE;
            deltaY = (deltaY / distance) * MAX_DISTANCE;
        }

        knobX = deltaX;
        knobY = deltaY;

        const direction = getDirection(deltaX, deltaY);

        if (direction !== lastDirection) {
            lastDirection = direction;

            // Clear existing interval
            if (moveInterval) {
                clearInterval(moveInterval);
                moveInterval = null;
            }

            if (direction) {
                // Dispatch immediately
                dispatch("move", { direction });

                // Set up continuous movement
                moveInterval = setInterval(() => {
                    if (lastDirection) {
                        dispatch("move", { direction: lastDirection });
                    }
                }, MOVE_RATE);
            }
        }
    }

    export function handleEnd() {
        isDragging = false;
        knobX = 0;
        knobY = 0;
        lastDirection = null;

        if (moveInterval) {
            clearInterval(moveInterval);
            moveInterval = null;
        }

        dispatch("end");
    }
</script>

{#if visible}
    <div class="joystick-floating" style="left: {posX}px; top: {posY}px;">
        <div class="joystick-base">
            <div
                class="joystick-knob"
                style="transform: translate({knobX}px, {knobY}px)"
            >
                <div class="knob-inner"></div>
            </div>
        </div>
    </div>
{/if}

<style>
    .joystick-floating {
        position: fixed;
        transform: translate(-50%, -50%);
        z-index: 100;
        pointer-events: none;
    }

    .joystick-base {
        width: 100px;
        height: 100px;
        background: rgba(0, 0, 0, 0.4);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .joystick-knob {
        width: 50px;
        height: 50px;
        background: rgba(255, 255, 255, 0.2);
        border: 2px solid var(--primary);
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: transform 0.05s;
    }

    .knob-inner {
        width: 24px;
        height: 24px;
        background: var(--primary);
        border-radius: 50%;
        opacity: 0.9;
    }
</style>
