"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, Plus, Trash, Edit2 } from "lucide-react";
import { useApiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  title: string;
  completed: boolean;
  estPomodoros: number;
  actPomodoros: number;
  note?: string;
}

interface TaskListProps {
  activeTask: Task | null;
  onActiveTaskChange: (task: Task | null) => void;
}

export function TaskList({ activeTask, onActiveTaskChange }: TaskListProps) {
  const apiClient = useApiClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskEst, setNewTaskEst] = useState(1);

  const fetchTasks = async () => {
    try {
      const res = await apiClient.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [apiClient]);

  const startEditing = (task: Task) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskEst(task.estPomodoros);
    setIsDialogOpen(true);
  };

  const saveTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    try {
      if (editingTask) {
        // Update existing
        await apiClient.put(`/tasks/${editingTask.id}`, {
          title: newTaskTitle,
          estPomodoros: newTaskEst,
        });
        setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, title: newTaskTitle, estPomodoros: newTaskEst } : t));
      } else {
        // Create new
        await apiClient.post('/tasks', {
          title: newTaskTitle,
          estPomodoros: newTaskEst
        });
        fetchTasks();
      }
      closeDialog();
    } catch (err) {
      console.error("Failed to save task", err);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      await apiClient.put(`/tasks/${task.id}`, {
        completed: !task.completed
      });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    } catch (err) {
      console.error("Failed to toggle task", err);
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await apiClient.delete(`/tasks/${id}`);
      setTasks(tasks.filter(t => t.id !== id));
      if (activeTask?.id === id) onActiveTaskChange(null);
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTask(null);
    setNewTaskTitle("");
    setNewTaskEst(1);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Task Header - More Prominent */}
      <Card className="p-4 bg-gradient-to-r from-primary/20 to-primary/5 border-primary/30 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              📋 Tasks
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select a task before starting the timer
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input 
                  placeholder="What are you working on?" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  autoFocus
                />
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Est Pomodoros</span>
                  <Input 
                    type="number" 
                    min={1} 
                    max={10} 
                    value={newTaskEst}
                    onChange={(e) => setNewTaskEst(Number(e.target.value))}
                    className="w-20"
                  />
                </div>
                <Button onClick={saveTask} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Active Task Indicator */}
      {activeTask && (
        <Card className="p-4 bg-green-500/10 border-green-500/30 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            <div className="text-sm font-medium text-green-600 dark:text-green-400">Currently Tracking</div>
          </div>
          <div className="text-lg font-bold mt-1">
            {activeTask.title}
          </div>
        </Card>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {tasks.map(task => (
           <Card 
             key={task.id}
             className={cn(
               "p-3 flex items-center justify-between cursor-pointer transition-all hover:shadow-md",
               activeTask?.id === task.id 
                 ? "border-2 border-green-500/50 bg-green-500/5 shadow-md" 
                 : "bg-card/60 hover:bg-card/80 border-border/50",
               task.completed && "opacity-60 grayscale"
             )}
             onClick={() => onActiveTaskChange(task)}
           >
             <div className="flex items-center space-x-3 overflow-hidden flex-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleTask(task); }}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                    task.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-primary"
                  )}
                >
                  {task.completed && <Check className="h-4 w-4" />}
                </button>
                <span className={cn("font-medium truncate", task.completed && "line-through text-muted-foreground")}>
                  {task.title}
                </span>
             </div>
             
             <div className="flex items-center space-x-1 text-muted-foreground text-sm shrink-0">
               <span className="mr-2 font-mono">{task.actPomodoros}/{task.estPomodoros} 🍅</span>
               
               <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-primary"
                onClick={(e) => { e.stopPropagation(); startEditing(task); }}
               >
                 <Edit2 className="h-3.5 w-3.5" />
               </Button>

               <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
               >
                 <Trash className="h-3.5 w-3.5" />
               </Button>
             </div>
           </Card>
        ))}
        {tasks.length === 0 && (
          <Card className="p-8 text-center border-2 border-dashed border-primary/30 bg-primary/5">
            <div className="text-4xl mb-2">📝</div>
            <div className="font-medium text-foreground">No tasks yet</div>
            <div className="text-sm text-muted-foreground mt-1">
              Add a task above to track your pomodoros!
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
