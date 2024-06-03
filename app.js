const express = require('express')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
let db = null
let format = require('date-fns/format')
let isValid = require('date-fns/isValid')
var parse = require('date-fns/parse')
app.use(express.json())
const dbPath = path.join(__dirname, 'todoApplication.db')

const intializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000')
    })
  } catch (e) {
    console.log(`${e.message}`)
    process.exit(1)
  }
}
intializeDBAndServer()

const hasStatusAndPriority = requestQuery => {
  return (
    requestQuery.status !== undefined && requestQuery.priority !== undefined
  )
}
const hasStatus = requestQuery => {
  return requestQuery.status !== undefined
}
const hasPriority = requestQuery => {
  return requestQuery.priority !== undefined
}
const hasCategory = requestQuery => {
  return requestQuery.category !== undefined
}
const hasCategoryAndStatus = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  )
}
const hasCategoryAndPriority = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  )
}

app.get('/todos/', async (request, response) => {
  const {status, priority, search_q = '', category} = request.query
  console.log(status)
  let getTodosQuery = ''

  if (
    status &&
    status !== 'TO DO' &&
    status !== 'IN PROGRESS' &&
    status !== 'DONE'
  ) {
    return response.status(400).send('Invalid Todo Status')
  }

  if (
    priority &&
    priority !== 'HIGH' &&
    priority !== 'MEDIUM' &&
    priority !== 'LOW'
  ) {
    return response.status(400).send('Invalid Todo Priority')
  }

  if (
    category &&
    category !== 'WORK' &&
    category !== 'HOME' &&
    category !== 'LEARNING'
  ) {
    return response.status(400).send('Invalid Todo Category')
  }

  switch (true) {
    case hasStatusAndPriority(request.query):
      getTodosQuery = `
        select * from
        todo where
        todo like '%${search_q}%' and
        status = '${status}' and 
        priority = '${priority}'
      `
      break
    case hasCategoryAndStatus(request.query):
      getTodosQuery = `
        select * from
        todo where
        todo like '%${search_q}%' and
        status = '${status}' and 
        category = '${category}'
      `
      break
    case hasCategoryAndPriority(request.query):
      getTodosQuery = `
        select * from
        todo where
        todo like '%${search_q}%' and
        category = '${category}' and
        priority = '${priority}'
      `
      break
    case hasStatus(request.query):
      getTodosQuery = `
        select * from
        todo where
        todo like '%${search_q}%' and
        status = '${status}'
      `
      break
    case hasPriority(request.query):
      getTodosQuery = `
        select * from
        todo where 
        todo like '%${search_q}%' and
        priority = '${priority}'
      `
      break
    case hasCategory(request.query):
      getTodosQuery = `
        select * from
        todo where 
        todo like '%${search_q}%' and
        category = '${category}'
      `
      break
    default:
      getTodosQuery = `
       select * from todo 
       where todo like '%${search_q}%'
      `
  }
  const todos = await db.all(getTodosQuery)
  const format = todo => {
    return {
      id: todo.id,
      todo: todo.todo,
      priority: todo.priority,
      status: todo.status,
      category: todo.category,
      dueDate: todo.due_date,
    }
  }

  response.send(todos.map(todo => format(todo)))
})

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  console.log(todoId)
  const getTodoQuery = `
    select * from
    todo where
    id = '${todoId}'
  `
  const format = todo => {
    return {
      id: todo.id,
      todo: todo.todo,
      priority: todo.priority,
      status: todo.status,
      category: todo.category,
      dueDate: todo.due_date,
    }
  }
  const todo = await db.get(getTodoQuery)
  response.send(format(todo))
})

app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  console.log(date)
  const parsedDate = parse(date, 'yyyy-MM-dd', new Date())
  if (!isValid(parsedDate)) {
    return response.status(400).send('Invalid Due Date')
  }
  // const formattedDueDate = format(parsedDate, "yyyy-MM-dd")
  const getTodoQuery = `
    select * from
    todo where
    due_date = '${date}'
  `
  const format = todo => {
    return {
      id: todo.id,
      todo: todo.todo,
      priority: todo.priority,
      status: todo.status,
      category: todo.category,
      dueDate: todo.due_date,
    }
  }
  const todos = await db.all(getTodoQuery)
  if (todos.length > 0) {
    response.send(todos.map(todo => format(todo)))
  }
})

app.post('/todos/', async (request, response) => {
  const {id, priority, status, todo, category, dueDate} = request.body
  const parsedDate = parse(dueDate, 'yyyy-MM-dd', new Date())
  if (!isValid(parsedDate)) {
    return response.status(400).send('Invalid Due Date')
  }
  if (
    status &&
    status !== 'TO DO' &&
    status !== 'IN PROGRESS' &&
    status !== 'DONE'
  ) {
    return response.status(400).send('Invalid Todo Status')
  }

  if (
    priority &&
    priority !== 'HIGH' &&
    priority !== 'MEDIUM' &&
    priority !== 'LOW'
  ) {
    return response.status(400).send('Invalid Todo Priority')
  }

  if (
    category &&
    category !== 'WORK' &&
    category !== 'HOME' &&
    category !== 'LEARNING'
  ) {
    return response.status(400).send('Invalid Todo Category')
  }

  const formattedDueDate = format(parsedDate, 'yyyy-MM-dd')
  console.log(formattedDueDate, isValid(parsedDate))

  const addTodoQuery = `
    insert into todo (id, priority, status, todo, category, due_date)
    values (${id}, '${priority}', '${status}', '${todo}', '${category}', '${formattedDueDate}')
  `
  await db.run(addTodoQuery)
  response.send('Todo Successfully Added')
})

app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const todoDetails = request.body

  let updateColumn = ''
  if (todoDetails.todo !== undefined) updateColumn = 'Todo'
  if (todoDetails.priority !== undefined) updateColumn = 'Priority'
  if (todoDetails.status !== undefined) updateColumn = 'Status'
  if (todoDetails.category !== undefined) updateColumn = 'Category'
  if (todoDetails.dueDate !== undefined) updateColumn = 'Due Date'

  const prevTodoQuery = `SELECT * FROM todo WHERE id = ${todoId}`
  const prevTodo = await db.get(prevTodoQuery)
  if (!prevTodo) {
    return response.status(404).send('Todo Not Found')
  }

  let {
    todo = prevTodo.todo,
    priority = prevTodo.priority,
    status = prevTodo.status,
    dueDate = prevTodo.due_date,
    category = prevTodo.category,
  } = todoDetails

  const validStatuses = ['TO DO', 'IN PROGRESS', 'DONE']
  const validPriorities = ['HIGH', 'MEDIUM', 'LOW']
  const validCategories = ['WORK', 'HOME', 'LEARNING']

  if (status && !validStatuses.includes(status)) {
    return response.status(400).send('Invalid Todo Status')
  }
  if (priority && !validPriorities.includes(priority)) {
    return response.status(400).send('Invalid Todo Priority')
  }
  if (category && !validCategories.includes(category)) {
    return response.status(400).send('Invalid Todo Category')
  }
  if (dueDate) {
    let parsedDate = parse(dueDate, 'yyyy-MM-dd', new Date())
    if (!isValid(parsedDate)) {
      return response.status(400).send('Invalid Due Date')
    }
    dueDate = format(parsedDate, 'yyyy-MM-dd')
  }
  const updateTodoQuery = `
    update todo set 
    todo = '${todo}',
    priority = '${priority}',
    status = '${status}',
    due_date = '${dueDate}',
    category = '${category}'
    where id = ${todoId}
  `

  await db.run(updateTodoQuery)
  response.send(`${updateColumn} Updated`)
})

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  console.log(todoId)
  const getTodoQuery = `
    delete from 
    todo where
    id = '${todoId}'
  `
  await db.run(getTodoQuery)
  response.send('Todo Deleted')
})

module.exports = app
