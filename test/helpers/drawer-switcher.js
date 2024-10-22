/**
 * Ability to switch between different drawers.
 * Usage: with two viewers, we would do
 *
 * const switcher = new DrawerSwitcher();
 * switcher.addDrawerOption("drawer_left", "Select drawer for the left viewer", "canvas");
 * switcher.addDrawerOption("drawer_right", "Select drawer for the right viewer", "webgl");
 * const viewer1 = window.viewer1 = new OpenSeadragon({
 *     id: 'openseadragon',
 *     ...
 *     drawer:switcher.activeImplementation("drawer_left"),
 * });
 * $("#my-title-for-left-drawer").html(`Viewer using drawer ${switcher.activeName("drawer_left")}`);
 * $("#container").html(switcher.render());
 * // OR switcher.render("#container")
 * // ..do the same for the second viewer
 */
class DrawerSwitcher {
    url = new URL(window.location.href);
    drawers = {
        canvas: "Context2d drawer (default in OSD &lt;= 4.1.0)",
        webgl: "New WebGL drawer"
    };
    _data = {}

    addDrawerOption(urlQueryName, title="Select drawer:", defaultDrawerImplementation="canvas") {
        const drawer = this.url.searchParams.get(urlQueryName) || defaultDrawerImplementation;
        if (!this.drawers[drawer]) throw "Unsupported drawer implementation: " + drawer;

        let context = this._data[urlQueryName] = {
            query: urlQueryName,
            implementation: drawer,
            title: title
        };
    }

    activeName(urlQueryName) {
        return this.drawers[this.activeImplementation(urlQueryName)];
    }

    activeImplementation(urlQueryName) {
        return this._data[urlQueryName].implementation;
    }

    _getFormData(useNewline=true) {
        return Object.values(this._data).map(ctx => `${ctx.title}&nbsp;
<select name="${ctx.query}">
  ${Object.entries(this.drawers).map(([k, v]) => {
            const selected = ctx.implementation === k ? "selected" : "";
            return `<option value="${k}" ${selected}>${v}</option>`;
        }).join("\n")}
</select>`).join(useNewline ? "<br>" : "");
    }

    _preserveOtherSeachParams() {
        let res = [], registered = Object.keys(this._data);
        for (let [k, v] of this.url.searchParams.entries()) {
            if (!registered.includes(k)) {
                res.push(`<input name="${k}" type="hidden" value=${v} />`);
            }
        }
        return res.join('\n');
    }

    render(selector, useNewline=undefined) {
        useNewline = typeof useNewline === "boolean" ? useNewline : Object.keys(this._data).length > 1;
        const html = `<div>
  <form method="get">
     ${this._preserveOtherSeachParams()}
     ${this._getFormData()}${useNewline ? "<br>":""}<button>Submit</button>
  </form>
</div>`;
        if (selector) $(selector).append(html);
        return html;
    }
}
