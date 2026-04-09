import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

interface Todo {
  id: number;
  name: string;
}

export default async function TodosPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const { data: todos } = await supabase.from("todos").select("id, name");

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Todos</h1>
      <ul className="list-disc pl-6 space-y-1">
        {(todos as Todo[] | null)?.map((todo) => (
          <li key={todo.id}>{todo.name}</li>
        )) ?? <li>No todos found.</li>}
      </ul>
    </div>
  );
}
