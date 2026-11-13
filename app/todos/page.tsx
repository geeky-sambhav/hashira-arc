import { Suspense } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

async function TodoList() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos, error } = await supabase.from("todos").select();

  if (error) {
    return <p>Could not load todos: {error.message}</p>;
  }

  return (
    <ul>
      {todos?.map((todo) => (
        <li key={todo.id}>{todo.name}</li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <main>
      <h1>Todos</h1>
      <Suspense fallback={<p>Loading todos…</p>}>
        <TodoList />
      </Suspense>
    </main>
  );
}
