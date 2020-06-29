// By order of priority
var operators = ["*", "/", "+", "-"]

var operators_mapping = {
    "+": "plus",
    "-": "minus",
    "*": "multiply",
    "/": "divide",
}


function plus(a, b) { return a + b }
function minus(a, b) { return a - b }
function multiply(a, b) { return a * b }
function divide(a, b) { return a / b }
function invert(a) { return - a }
function power(n, p) { return n ** p }

var functions = {
    "invert": invert,
    "plus": plus,
    "minus": minus,
    "multiply": multiply,
    "divide": divide,
    "power": power
}


function alpha_to_int(s) {
    var res = 0
    for (var i = 0; i < s.length; i += 1) {
        res += 26**(s.length - 1 - i) * (s.charCodeAt(i) - 64)
    }
    return res
}

function int_to_alpha(i) {
    if (i === 1) { return "A" }
    var res = "", q, r
    i -= 1
    while (i > 0) {
        r = i % 26
        i = (i - r) / 26
        res = String.fromCharCode(r + 64 + (res === "" ? 1 : 0)) + res
    }
    return res
}


// Naive datastructure: 2D array, initially empty
function Spreadsheet() {
    this.cell_contents = []
    this.parsed_formulas = []
    this.cells_referencing = {}
}

Spreadsheet.prototype.set = function(ref, formula) {
    var parts = ref.match(/^(\$?)([A-Z]+)(\$?)([0-9]+)$/)
    if (!parts) { throw new Error("Unexpected format for cell reference: " + ref) }
    var x = alpha_to_int(parts[2])
    var y = parseInt(parts[4], 10)

    if (!this.cell_contents[x]) { this.cell_contents[x] = [] }
    this.cell_contents[x][y] = formula

    var parsed_formula = new Node(formula)
    parsed_formula.construct_from_raw()

    if (!this.parsed_formulas[x]) { this.parsed_formulas[x] = [] }
    this.parsed_formulas[x][y] = parsed_formula

    // Maintain an index of which cells to update after a cell was updated
    var ref = int_to_alpha(x) + y
    for (cell of parsed_formula.get_cells()) {
        if (!this.cells_referencing[cell]) { this.cells_referencing[cell] = [] }
        if (this.cells_referencing[cell].indexOf(ref) === -1) {
            this.cells_referencing[cell].push(ref)
        }
    }
}

Spreadsheet.prototype.get_value = function(ref) {
    var parts = ref.match(/^(\$?)([A-Z]+)(\$?)([0-9]+)$/)
    if (!parts) { throw new Error("Unexpected format for cell reference: " + ref) }
    var x = alpha_to_int(parts[2])
    var y = parseInt(parts[4], 10)

    // Empty cell interpreted as equal to 0
    if (!this.parsed_formulas[x] || !this.parsed_formulas[x][y]) {
        return 0
    } else {
        // TODO: detect cycles in cell references
        // TODO: avoid calculating the same intermediate value multiple times (memoize recursive algorithm)
        // TODO: don't calculate the same cell value multiple times if cell appears multiple times in the formula
        var values = {}
        for (cell of this.parsed_formulas[x][y].get_cells()) { values[cell] = this.get_value(cell) }
        this.parsed_formulas[x][y].set_cell_values(values)
        return this.parsed_formulas[x][y].evaluate()
    }
}

Spreadsheet.prototype.get_contents = function(ref) {
    var parts = ref.match(/^(\$?)([A-Z]+)(\$?)([0-9]+)$/)
    if (!parts) { throw new Error("Unexpected format for cell reference: " + ref) }
    var x = alpha_to_int(parts[2])
    var y = parseInt(parts[4], 10)

    if (!this.cell_contents[x] || !this.cell_contents[x][y]) {
        return ""
    } else {
        return this.cell_contents[x][y]
    }
}

Spreadsheet.prototype.get_referencing = function(ref) {
    return (this.cells_referencing[ref] || [])
}



// Simulating named arguments with an object
function Node(args) {
    this.children = []

    if (typeof(args) === "string") {
        if (args.length > 0 && args[0] !== "=") { args = "=" + args }
        this.raw = args
        return
    }

    if (typeof(args) === "number") {
        this.value = args
        return
    }

    if (args instanceof Node) {
        this.clone_from_node(args)
    }

    if (!args) { args = {} }

    this.raw = args.raw
    this.value = args.value
    this.cell = args.cell
    //this.cell_value = 0   // Default value
    this.func = args.func
}

// Traverse whole tree. f can modify the tree nodes. Returns all non undefined values returned by f
Node.prototype.traverse = function(f) {
    var res = []

    if (f(this) !== undefined) {
        res.push(f(this))
    }

    for (child of this.children) {
        res = res.concat(child.traverse(f))
    }

    return res
}

Node.prototype.get_cells = function() {
    return this.traverse(function(n) { if (n.cell) { return n.cell } })
}

// Cell are placeholders for their values until set_cell_values by calling Spreadsheet
// values = { cell_reference: value }
Node.prototype.set_cell_values = function(values) {
    this.traverse(function(n) {
        if (n.cell) {
            n.cell_value = values[n.cell]
        }
    })
}

Node.prototype.clone_from_node = function(n) {
    this.children = n.children
    this.raw = n.raw
    this.value = n.value
    this.cell = n.cell
    this.func = n.func
}

Node.prototype.print = function(prefix) {
    if (!prefix) { prefix = [] }

    var rep = []
    if (this.raw) { rep.push("raw: " + this.raw) }
    if (this.value) { rep.push("value: " + this.value) }
    if (this.cell) { rep.push("cell: " + this.cell + " - value: " + this.cell_value) }
    if (this.func) { rep.push("func: " + this.func) }
    rep = "< " + rep.join("; ") + " >"

    var white = []
    for (var w of prefix) {
        if (w === "full") { white.push("|   ") }
        if (w === "empty") { white.push("    ") }
        if (w === "end") { white.push("└   ") }
    }

    if (white.length >=1) {
        white[white.length - 1] = white[white.length - 1].replace(/ /g, "-")
    }

    rep = white.join("") + rep
    console.log(rep);

    if (prefix[prefix.length - 1] === "end") {
        prefix[prefix.length - 1] = "empty"
    }

    var p
    for (var i = 0; i < this.children.length; i += 1) {
        p = prefix.slice()
        p.push(i === this.children.length - 1 ? "end" : "full")
        this.children[i].print(p)
    }
}

Node.prototype.add_child = function(n) {
    if (!n instanceof Node) { throw new Error("Expected node") }
    this.children.push(n)
}

// Could be better written :)
Node.prototype.construct_from_raw = function() {
    if (!this.raw) {
        for (child of this.children) { child.construct_from_raw() }
        return
    }

    if (this.raw.length === 0) { this.value = "" }
    if (this.raw[0] === "'") { this.value = this.raw.substring(1) }
    if (this.raw[0] !== "=") { this.value = this.raw }
    if (this.value) {
        this.raw = null
        for (child of this.children) { child.construct_from_raw() }
        return
    }

    // raw is a formula
    var f = this.raw.substring(1).replace(/ /g, "")

    var elements = [], func_name, cell_name, number, length
    var i = 0

    // Extract elements
    while (i < f.length) {
        if (operators.indexOf(f[i]) !== -1) {
            elements.push(f[i])
            i += 1

        } else if (f[i] >= 'a' && f[i] <= 'z') {   // Function name and body
            func_name = f.match(new RegExp("^.{" + i + "}([a-z]+)"))
            if (!func_name) { throw new Error("Expected function name") }
            func_name = func_name[1]
            i += func_name.length

            if (f[i] !== "(") { throw new Error("Expected opening parenthesis") }
            func_name += "("
            i += 1
            opened = 1
            while (opened > 0 && i < f.length) {
                func_name += f[i]
                if (f[i] === "(") { opened += 1 }
                if (f[i] === ")") { opened -= 1 }
                i += 1
            }

            if (opened > 0) { throw new Error("Expected closing parenthesis") }
            elements.push(func_name)

        } else if (f[i] >= 'A' && f[i] <= 'Z') {   // Cell name
            cell_name = f.match(new RegExp("^.{" + i + "}([A-Z]+[0-9]+)"))
            if (!cell_name) { throw new Error("Expected cell name") }
            cell_name = cell_name[1]
            elements.push(cell_name)
            i += cell_name.length

        } else if (f[i] >= '0' && f[i] <= '9') {   // Number
            number = f.match(new RegExp("^.{" + i + "}([0-9]+\\.[0-9]+)"))
            if (number) {
                number = number[1]
                length = number.length
                number = parseFloat(number)
            } else {
                number = f.match(new RegExp("^.{" + i + "}([1-9][0-9]*)"))
                if (!number) { throw new Error("Expected number") }
                number = number[1]
                length = number.length
                number = parseInt(number, 10)
            }
            elements.push(number)
            i += length

        } else {
            throw new Error("Unexpected character")
        }
    }

    if (elements.length > 1) {   // Infix expression
        // TODO: add support for parentheses
        var i0, j, n, op
        for (ops of [["*", "/"], ["+", "-"]]) {
            i0 = null
            while (i0 !== elements.length) {
                _elements = []

                // Index of first operator in ops appearing in elements array
                // If none found, i0 = elements.length
                i0 = Math.min.apply(null, ops.map(function(op) { return elements.indexOf(op) === -1 ? elements.length : elements.indexOf(op) }))
                op = elements[i0]

                if (i0 !== elements.length) {
                    for (j = 0; j < i0 - 1; j += 1) { _elements.push(elements[j]) }
                    n = new Node({ func: operators_mapping[op] })
                    n.add_child(new Node(elements[i0 - 1]))
                    n.add_child(new Node(elements[i0 + 1]))
                    _elements.push(n)
                    for (j = i0 + 2; j < elements.length; j += 1) { _elements.push(elements[j]) }
                    elements = _elements
                }
            }
        }
        this.clone_from_node(elements[0])

    } else {   // Value, cell or function
        var elt = elements[0]
        if (typeof(elt) === "number") {
            this.value = elt
        } else if (elt.match(/^\$?[A-Z]+\$?[0-9]+$/)) {
            this.cell = elt
        } else {   // Function
            var func_name = elt.match(/^([a-z]+)/)
            if (!func_name) { throw new Error("Expected function name") }
            func_name = func_name[1]

            var args = [], opened = 1, i = func_name.length + 1, arg
            while (i < elt.length) {
                arg = ""
                while (i < elt.length) {
                    if (opened === 1 && (elt[i] === "," || elt[i] === ")")) { break }
                    if (elt[i] === "(") { opened += 1 }
                    if (elt[i] === ")") { opened -= 1 }

                    arg += elt[i]
                    i += 1
                }
                args.push(arg)
                if (elt[i] === ")") { break }
                i += 1
            }

            this.func = func_name
            for (arg of args) { this.add_child(new Node(arg)) }
        }
    }

    this.raw = null
    for (child of this.children) { child.construct_from_raw() }
}

Node.prototype.evaluate = function() {
    if (this.value) {
        return this.value

    } else if (this.cell) {
        return this.cell_value ? this.cell_value : 0

    } else if (this.func) {
        var f = functions[this.func]
        if (!f) { throw new Error("Unknown function " + this.func) }
        if (f.length != this.children.length) { throw new Error(this.func + " expects " + f.length + " arguments") }

        return f.apply(null, this.children.map(function(c) { return c.evaluate() }))

    } else {
        throw new Error("Illegal node!")
    }
}



var cell_width = 200, cell_height = 24
var x0 = 30, y0 = 100
var X = 5, Y = 15
var x, y, div
var container = document.getElementById("container")
var cells = document.createElement('div')

container.appendChild(cells)

for (x = 1; x <= X; x += 1) {
    for (y = 1; y <= Y; y += 1) {
        div = document.createElement('div')
        div.classList.add("cell")
        div.style.left = (x0 + cell_width * (x - 1)) + "px"
        div.style.top = (y0 + cell_height * (y - 1)) + "px"
        div.setAttribute("cell-name", int_to_alpha(x) + y)

        cells.appendChild(div)
    }
}

var input_bar = document.createElement('input')
input_bar.classList.add("cell")
input_bar.style.left = x0 + "px"
input_bar.style.top = (y0 - 70) + "px"
input_bar.style.width = (X * cell_width) + "px"
container.appendChild(input_bar)


var s = new Spreadsheet()

function get_div(ref) {
    return cells.querySelectorAll("div[cell-name=" + ref + "]")[0]
}

function set_cell_formula(ref, formula) {
    s.set(ref, formula)
    get_div(ref).innerHTML = s.get_value(ref)

    for (cell of s.get_referencing(ref)) {
        get_div(cell).innerHTML = s.get_value(cell)
    }
}

var selected_ref

// Selecting a cell
cells.addEventListener("click", function (evt) {
    var ref = evt.target.getAttribute("cell-name");
    for (div of container.querySelectorAll(".selected")) { div.classList.remove("selected") }
    evt.target.classList.add("selected")
    selected_ref = ref

    input_bar.value = s.get_contents(ref)
    input_bar.focus()
})


input_bar.addEventListener("keypress", function(evt) {
    if (evt.keyCode === 13) {   // Press Enter
        set_cell_formula(selected_ref, evt.target.value)
        get_div(selected_ref).classList.remove("selected")
        evt.target.value = ""
    }
})

var to_be_copied

container.addEventListener("keydown", function(evt) {
    if (evt.key === "c" && evt.ctrlKey) {
        if (to_be_copied) { get_div(to_be_copied).classList.remove("to-be-copied") }
        get_div(selected_ref).classList.add("to-be-copied")
        to_be_copied = selected_ref
    }


})



