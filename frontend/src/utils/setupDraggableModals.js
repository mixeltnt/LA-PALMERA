/**
 * ============================================================================
 * SISTEMA GLOBAL DE VENTANAS MODALES ARRASTRABLES Y RESPONSIVAS
 * ============================================================================
 * Permite que cualquier modal del sistema (Productos, Clientes, Ventas, Compras,
 * Proveedores, Usuarios, Categorías, Caja, Configuración, etc.) pueda ser movido
 * libremente arrastrando su cabecera (.modal-header).
 * 
 * Funciona de forma automática y transparente mediante delegación de eventos.
 */

export function setupDraggableModals() {
  let isDragging = false;
  let activeDialog = null;
  let activeHeader = null;
  let startPointerX = 0;
  let startPointerY = 0;
  let dialogStartRect = null;
  let dialogStartTranslateX = 0;
  let dialogStartTranslateY = 0;

  const onPointerDown = (e) => {
    // Solo clic izquierdo o toque primario
    if (e.button !== undefined && e.button !== 0) return;

    // Buscar si el click fue dentro de una cabecera arrastrable
    const header = e.target.closest(
      ".modal-header, .lp-asistente-header, .lp-draggable-header"
    );
    if (!header) return;

    // Ignorar si el usuario hizo click en botones, inputs, selects, links o el botón de cierre
    if (
      e.target.closest(
        "button, input, select, textarea, a, .btn-close, [role='button'], .nav-link, .dropdown-toggle"
      )
    ) {
      return;
    }

    const dialog = header.closest(
      ".modal-dialog, .lp-asistente-modal, .lp-draggable-modal"
    );
    if (!dialog) return;

    activeDialog = dialog;
    activeHeader = header;
    isDragging = true;

    // Guardar posición inicial y bounding rect
    dialogStartRect = dialog.getBoundingClientRect();
    const curX = parseFloat(dialog.dataset.dragX || "0");
    const curY = parseFloat(dialog.dataset.dragY || "0");
    dialogStartTranslateX = isNaN(curX) ? 0 : curX;
    dialogStartTranslateY = isNaN(curY) ? 0 : curY;

    startPointerX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    startPointerY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    // Evitar selección de texto accidental durante el arrastre
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    document.body.classList.add("modal-dragging-active");
    header.style.cursor = "grabbing";

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!isDragging || !activeDialog || !dialogStartRect) return;

    const currentPointerX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const currentPointerY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    const deltaX = currentPointerX - startPointerX;
    const deltaY = currentPointerY - startPointerY;

    // Mantener la ventana dentro de los límites visibles de la pantalla
    const minDeltaX = 10 - dialogStartRect.left;
    const maxDeltaX = (window.innerWidth - 10) - dialogStartRect.right;
    const clampedDeltaX = Math.min(Math.max(deltaX, minDeltaX), maxDeltaX);

    const minDeltaY = 10 - dialogStartRect.top;
    const maxDeltaY = Math.max(minDeltaY, (window.innerHeight - 60) - dialogStartRect.top);
    const clampedDeltaY = Math.min(Math.max(deltaY, minDeltaY), maxDeltaY);

    const nextX = dialogStartTranslateX + clampedDeltaX;
    const nextY = dialogStartTranslateY + clampedDeltaY;

    activeDialog.style.transform = `translate(${nextX}px, ${nextY}px)`;
    activeDialog.dataset.dragX = String(nextX);
    activeDialog.dataset.dragY = String(nextY);
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";
    document.body.classList.remove("modal-dragging-active");

    if (activeHeader) {
      activeHeader.style.cursor = "grab";
    }

    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    activeDialog = null;
    activeHeader = null;
    dialogStartRect = null;
  };

  // Reset con doble click en la cabecera
  const onDblClick = (e) => {
    const header = e.target.closest(
      ".modal-header, .lp-asistente-header, .lp-draggable-header"
    );
    if (!header) return;
    if (e.target.closest("button, input, select, textarea, a, .btn-close")) return;

    const dialog = header.closest(
      ".modal-dialog, .lp-asistente-modal, .lp-draggable-modal"
    );
    if (dialog) {
      dialog.style.transform = "translate(0px, 0px)";
      dialog.dataset.dragX = "0";
      dialog.dataset.dragY = "0";
    }
  };

  // Asignar listeners globales a nivel de documento
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("dblclick", onDblClick);

  return () => {
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("dblclick", onDblClick);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  };
}
