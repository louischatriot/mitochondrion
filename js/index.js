console.log("===");

function whitespace(n) {
    if (!n) { return "" }
    var res = []
    for (var i = 0; i < n; i += 1) {
        res.push((i % 4 === 0) ? " " : " ")
    }

    //if (res.length >=4) {
        //res[res.length - 1] = "-"
        //res[res.length - 2] = "-"
        //res[res.length - 3] = "-"
        //res[res.length - 4] = "└"
    //}

    return res.join("")
}


// By order of priority
var operators = ["*", "/", "+", "-"]

var operators_mapping = {
    "+": "plus",
    "-": "minus",
    "*": "multiply",
    "/": "divide",
}


function plus(a, b) { return a + b }
function invert(a) { return - a }

var functions = {
    "invert": invert,
    "plus": plus
}


// Simulating named arguments with an object
function Node(args) {
    this.children = []

    if (typeof(args) === "string") {
        this.raw = args
        return
    }

    if (typeof(args) === "number") {
        this.value = args
        return
    }

    if (args instanceof Node) {
        this.children = args.children
    }

    if (!args) { args = {} }

    this.raw = args.raw
    this.value = args.value
    this.cell = args.cell
    this.func = args.func
}


Node.prototype.print = function(depth) {
    if (!depth) { depth = 0 }

    var rep = []
    if (this.raw) { rep.push("raw: " + this.raw) }
    if (this.value) { rep.push("value: " + this.value) }
    if (this.cell) { rep.push("cell: " + this.cell) }
    if (this.func) { rep.push("func: " + this.func) }

    rep = whitespace(depth) + "< " + rep.join("; ") + " >"
    //console.log(this);

    console.log(rep);

    for (child of this.children) {
        child.print(depth + 4)
    }
}

Node.prototype.add_child = function(n) {
    // TODO: check that n is a Node
    this.children.push(n)
}

Node.prototype.construct_from_raw = function() {
    if (!this.raw) { return }

    if (this.raw.length === 0) { this.value = "" }
    if (this.raw[0] === "'") { this.value = this.raw.substring(1) }
    if (this.raw[0] !== "=") { this.value = this.raw }
    if (this.value) {
        this.raw = null
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

    // Create calculation tree
    console.log(elements);

    var i0, j, n

    for (op of operators) {
        i0 = null
        while (i0 !== -1) {
            _elements = []
            i0 = elements.indexOf(op)

            if (i0 !== -1) {
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


    console.log("---------------------------");
    console.log(elements);

    //this.print()

    elements[0].print()

}

Node.prototype.evaluate = function() {
    if (this.value) {
        return this.value
    } else if (this.cell) {
        return this.cell.value()
    } else if (this.func) {
        // TODO
    } else {
        throw new Error("Illegal node!")
    }
}



var formula = "=55+44*2+  66*7 -plus(4,3)"

var n = new Node({ raw: formula })

n.construct_from_raw()

// TODO: add support for parentheses





function create_tree(elements) {
    if (elements.length === 0) { return null }

    var elt = elements[0]

    if (elements.length === 1) {
        if (elt[0] >= 'A' && elt[0] <= 'Z') {
            return new Node(null, elt, null, null, null)
        } else if (! isNaN(elt)) {
            return new Node(elt, null, null, null, null)
        } else {
            throw new Error("Unexpected element type")
        }
    }

    if (elt[0] >= 'a' && elt[0] <= 'z') {   // Function
        if (!functions[elt]) {
            throw new Error("Unknown function: " + elt)
        }

        if (elements.length === 1) {
            throw new Error("Nothing passed to function " + elt)
        }

        var func = functions[elt]
        var args = [], opened = 1, i = 2, arg

        while (opened > 0 && i < elements.length) {
            arg = []
            while (i < elements.length) {
                if (opened === 1 && (elements[i] === "," || elements[i] === ")")) { break }

                if (elements[i] === "(") {
                    opened += 1
                }

                if (elements[i] === ")") {
                    opened -= 1
                }

                arg.push(elements[i])
                i += 1
            }

            args.push(arg)

            if (elements[i] === ")") {
                break
            }

            i += 1
        }

        console.log(args);

        throw new Error("Missing closing parenthesis")

    }


}









