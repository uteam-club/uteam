import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { uploadFile, getFileUrl, deleteFile } from '@/lib/yandex-storage';
 
// Замените saveExerciseFile на uploadFile, getFileUrl на getFileUrl, deleteExerciseFiles на deleteFile из yandex-storage
// Проверьте, что при вызове uploadFile передаются buffer, key, contentType export {};
