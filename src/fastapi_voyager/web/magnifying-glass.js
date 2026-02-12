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

    defs
      .append("clipPath")
      .attr("id", this.clipPathId)
      .append("circle")
      .attr("r", this.radius)
      .attr("cx", 0)
      .attr("cy", 0)

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
      .attr("cx", 0) // Initialize at origin, will be updated on mouse move
      .attr("cy", 0)

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
      // 记录最后鼠标位置，用于第一次激活时的位置计算
      const rect = this.svg.getBoundingClientRect()
      this._lastMousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }

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
    // 使用 SVG 标准的坐标转换方法，代替 getBoundingClientRect()
    const pt = this.svg.createSVGPoint()
    pt.x = event.clientX
    pt.y = event.clientY

    let svgP
    try {
      // 转换为 SVG 坐标（考虑 SVG 内部所有变换）
      const ctm = this.svg.getScreenCTM()
      if (!ctm || !ctm.inverse) {
        // 如果 getScreenCTM() 失败，退回到简单方法
        const rect = this.svg.getBoundingClientRect()
        svgP = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        }
      } else {
        svgP = pt.matrixTransform(ctm.inverse())
      }
    } catch (e) {
      // 容错处理
      const rect = this.svg.getBoundingClientRect()
      svgP = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
    }

    // 调整放大镜位置，使其在鼠标上方，靠近下方边缘外侧
    // 偏移量：向下一点，让鼠标位于放大镜底部边缘外侧
    const offsetX = 0
    const offsetY = this.radius + 10 // 放大镜半径 + 10 像素偏移

    const lensX = svgP.x + offsetX
    const lensY = svgP.y - offsetY // 向上偏移

    // Move lens group to adjusted position
    this.lensGroup.attr("transform", `translate(${lensX}, ${lensY})`)

    // Move clipPath circle to original mouse position (保持内容对齐)
    d3.select(`#${this.clipPathId} circle`).attr("cx", svgP.x).attr("cy", svgP.y)

    // Move lens border circle to adjusted position relative to lens group
    this.lensGroup
      .select(".lens-border")
      .attr("cx", svgP.x - lensX)
      .attr("cy", svgP.y - lensY)

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

    // 移除节流，确保内容实时更新
    this.lensContent.html("")

    // Clone main graph content using D3's clone method
    const clonedContent = mainGroup.clone(true).node()
    this.lensContent.node().appendChild(clonedContent)

    // Apply correct transform: 居中到(x,y)，然后缩放
    // 关键修复：考虑 SVG 原始位置
    const scale = this.magnification
    this.lensContent.attr("transform", `translate(${-x}, ${-y}) scale(${scale})`)

    this._lastPosition = { x, y }
  }

  /**
   * Activate the magnifying glass
   */
  activate() {
    console.log("[MagnifyingGlass] Activating magnifier...")
    this.active = true
    this.lensGroup.style("display", null)
    d3.select(this.svg).classed("magnifier-active", true)

    // 解决第一次激活时的位置问题
    // 获取当前鼠标位置并立即更新内容
    this._updateContentFromCurrentMouse()
  }

  // 获取当前鼠标位置（跨浏览器兼容）
  _getCurrentMousePosition() {
    if (typeof this._lastMousePos !== "undefined") {
      return this._lastMousePos
    }

    // 作为备用方案，如果没有记录位置，返回 SVG 中心
    const rect = this.svg.getBoundingClientRect()
    return { x: rect.width / 2, y: rect.height / 2 }
  }

  // 使用当前鼠标位置更新内容
  _updateContentFromCurrentMouse() {
    const currentMousePos = this._getCurrentMousePosition()
    if (currentMousePos) {
      // 模拟事件对象
      this._performUpdate({
        clientX: currentMousePos.x + this.svg.getBoundingClientRect().left,
        clientY: currentMousePos.y + this.svg.getBoundingClientRect().top,
      })
    }
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
