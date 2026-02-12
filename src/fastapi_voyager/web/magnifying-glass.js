/**
 * Magnifying Glass for SVG Graph Visualization
 *
 * Provides a circular magnifying glass effect that follows the mouse cursor.
 * Activated by pressing the Space key.
 *
 * Usage:
 *   const magnifier = new MagnifyingGlass(svgElement, {
 *     magnification: 2.0,
 *     radius: 120
 *   })
 */

export class MagnifyingGlass {
  /**
   * @param {SVGElement} svgElement - The SVG element to magnify
   * @param {Object} options - Configuration options
   * @param {number} options.magnification - Zoom level (default: 2.0)
   * @param {number} options.radius - Lens radius in pixels (default: 100)
   */
  constructor(svgElement, options = {}) {
    this.svg = svgElement
    this.magnification = options.magnification || 2.0
    this.radius = options.radius || 100
    this.active = false

    // Throttle updates for performance
    this._pendingUpdate = false
    this._lastPosition = null

    this._initLens()
    this._bindEvents()
  }

  /**
   * Initialize the lens SVG elements
   * @private
   */
  _initLens() {
    console.log("[MagnifyingGlass] Initializing lens...")
    // 1. Create defs and clipPath
    const defs = d3.select(this.svg).append("defs")
    this.clipPathId = `lens-clip-${Math.random().toString(36).substr(2, 9)}`
    console.log("[MagnifyingGlass] clipPathId:", this.clipPathId)

    defs.append("clipPath").attr("id", this.clipPathId).append("circle").attr("r", this.radius)

    // 2. Create lens group (initially hidden)
    this.lensGroup = d3
      .select(this.svg)
      .append("g")
      .attr("class", "magnifying-lens")
      .style("display", "none")

    // 3. Create lens border circle
    this.lensGroup
      .append("circle")
      .attr("class", "lens-border")
      .attr("r", this.radius + 2)
      .attr("fill", "rgba(255,255,255,0.95)")
      .attr("stroke", "#999")
      .attr("stroke-width", 2)

    // 4. Create clipped content group
    this.lensContent = this.lensGroup
      .append("g")
      .attr("clip-path", `url(#${this.clipPathId})`)
      .append("g")
      .attr("class", "lens-content")

    console.log("[MagnifyingGlass] Lens initialized successfully")
  }

  /**
   * Bind keyboard and mouse events
   * @private
   */
  _bindEvents() {
    // Space key to toggle
    this._handleKeyDown = (e) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault()
        console.log("[MagnifyingGlass] Space pressed, activating...")
        this.toggle()
      }
    }

    this._handleKeyUp = (e) => {
      if (e.code === "Space") {
        console.log("[MagnifyingGlass] Space released, deactivating...")
        this.deactivate()
      }
    }

    this._handleMouseMove = (e) => {
      if (this.active) {
        this._updatePosition(e)
      }
    }

    this._handleClick = (e) => {
      if (this.active) {
        console.log("[MagnifyingGlass] Clicked, deactivating...")
        this.deactivate()
      }
    }

    document.addEventListener("keydown", this._handleKeyDown)
    document.addEventListener("keyup", this._handleKeyUp)
    this.svg.addEventListener("mousemove", this._handleMouseMove)
    this.svg.addEventListener("click", this._handleClick)

    console.log("[MagnifyingGlass] Events bound successfully")
  }

  /**
   * Update lens position and content based on mouse position
   * @private
   */
  _updatePosition(event) {
    // Use requestAnimationFrame for smooth performance
    if (this._pendingUpdate) return

    this._pendingUpdate = true
    requestAnimationFrame(() => {
      this._performUpdate(event)
      this._pendingUpdate = false
    })
  }

  /**
   * Perform the actual position update
   * @private
   */
  _performUpdate(event) {
    // Convert screen coordinates to SVG coordinates
    const pt = this.svg.createSVGPoint()
    pt.x = event.clientX
    pt.y = event.clientY
    const svgP = pt.matrixTransform(this.svg.getScreenCTM().inverse())

    // Move lens group (the circle and clipPath are inside, so they move with it)
    // The circle center is at (0,0) relative to the group, so we just translate the group
    this.lensGroup.attr("transform", `translate(${svgP.x}, ${svgP.y})`)

    // Update magnified content
    this._updateContent(svgP.x, svgP.y)
  }

  /**
   * Update the magnified content
   * @private
   */
  _updateContent(x, y) {
    // Use D3 selection (don't convert to DOM node)
    const mainGroup = d3.select(this.svg).select("g")
    if (mainGroup.empty()) return

    // Throttle: only update if moved more than 5 pixels
    if (this._lastPosition) {
      const dist = Math.sqrt(
        Math.pow(x - this._lastPosition.x, 2) + Math.pow(y - this._lastPosition.y, 2)
      )
      if (dist < 5) return
    }
    this._lastPosition = { x, y }

    // Clear old content
    this.lensContent.html("")

    // Clone main graph content using D3's clone method
    const clonedContent = mainGroup.clone(true).node()
    this.lensContent.node().appendChild(clonedContent)

    // Apply scale transform centered at the mouse position
    // The lens group is at (x, y), so we need to:
    // 1. Translate so point (x,y) moves to origin (0,0) - the lens center
    // 2. Then scale from that center point
    const scale = this.magnification
    this.lensContent.attr("transform", `translate(${-x}, ${-y}) scale(${scale})`)
  }

  /**
   * Activate the magnifying glass
   */
  activate() {
    console.log("[MagnifyingGlass] Activating magnifier...")
    this.active = true
    this.lensGroup.style("display", null)
    d3.select(this.svg).classed("magnifier-active", true)
  }

  /**
   * Deactivate the magnifying glass
   */
  deactivate() {
    console.log("[MagnifyingGlass] Deactivating magnifier...")
    this.active = false
    this.lensGroup.style("display", "none")
    d3.select(this.svg).classed("magnifier-active", false)
    this._lastPosition = null
  }

  /**
   * Toggle magnifying glass on/off
   */
  toggle() {
    this.active ? this.deactivate() : this.activate()
  }

  /**
   * Clean up and remove lens elements
   */
  destroy() {
    console.log("[MagnifyingGlass] Destroying...")
    // Remove event listeners
    document.removeEventListener("keydown", this._handleKeyDown)
    document.removeEventListener("keyup", this._handleKeyUp)
    this.svg.removeEventListener("mousemove", this._handleMouseMove)
    this.svg.removeEventListener("click", this._handleClick)

    if (this.lensGroup) this.lensGroup.remove()
    const defs = d3.select(this.svg).select("defs")
    if (defs) defs.select(`#${this.clipPathId}`).remove()
  }
}
